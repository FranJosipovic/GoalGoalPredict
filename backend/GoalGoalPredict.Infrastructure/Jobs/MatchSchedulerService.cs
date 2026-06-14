using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.UseCases.Admin;
using GoalGoalPredict.Infrastructure.UseCases.Matches;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.Jobs;

public class MatchSchedulerService(IServiceScopeFactory scopeFactory, ILogger<MatchSchedulerService> logger) : BackgroundService
{
    private DateTime _lastDailySync = DateTime.MinValue;

    // How often a single live (or about-to-start) match is polled for status/goals/cards.
    private static readonly TimeSpan LivePollInterval = TimeSpan.FromSeconds(60);
    // Start polling a few minutes BEFORE kickoff so we catch the API flipping it to "1H"
    // the moment the match starts (and can fire the "Kick off!" notification promptly).
    private static readonly TimeSpan KickoffLeadTime = TimeSpan.FromMinutes(5);
    // Safety net: also poll an NS fixture whose kickoff already passed (e.g. the scheduler
    // was down at kickoff) so we still pick it up. Wide enough to cover a full match incl.
    // extra time, but bounded so postponed/cancelled fixtures aren't polled forever.
    private static readonly TimeSpan MissedStartWindow = TimeSpan.FromHours(3);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(10), ct);

        while (!ct.IsCancellationRequested)
        {
            try { await RunCycleAsync(ct); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogError(ex, "Scheduler cycle error"); }

            // Cycle every 30s so per-match poll gates (90s live, etc.) fire on time;
            // the DB checks here are local — only PollLiveMatch actually spends API quota.
            await Task.Delay(TimeSpan.FromSeconds(30), ct);
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        // 1. Daily fixture sync (real WC only)
        if (now - _lastDailySync > TimeSpan.FromHours(23))
        {
            var syncFixtures = scope.ServiceProvider.GetRequiredService<SyncFixtures>();
            await syncFixtures.ExecuteAsync(ct);
            _lastDailySync = now;
        }

        // 2. Lineup sync — real WC matches only (sim matches have lineups set at creation)
        var needsLineup = await db.Matches
            .Where(m => m.Status == "NS"
                && !m.LineupsAvailable
                && m.Source == "ApiFootball"
                && m.KickoffUtc <= now.AddMinutes(35)
                && m.KickoffUtc > now.AddMinutes(-10))
            .ToListAsync(ct);

        foreach (var match in needsLineup)
        {
            logger.LogInformation("Lineup sync for match {Id}", match.Id);
            var syncLineups = scope.ServiceProvider.GetRequiredService<SyncLineups>();
            await syncLineups.ExecuteAsync(match.Id, ct);
            await Task.Delay(300, ct);
        }

        // 2b. Notify once when lineups become visible (30 min before kickoff) — both sim
        // matches (single group) and real WC matches (every group predicting the fixture).
        var lineupReveal = await db.Matches
            .Where(m => m.Status == "NS"
                && m.LineupsAvailable
                && !m.LineupRevealNotified
                && m.KickoffUtc <= now.AddMinutes(30)   // reveal window reached
                && m.KickoffUtc > now                   // not yet kicked off
                && (m.SimulationGroupId != null || m.Source == "ApiFootball"))
            .ToListAsync(ct);

        if (lineupReveal.Count > 0)
        {
            var push = scope.ServiceProvider.GetRequiredService<Services.PushNotificationService>();
            foreach (var match in lineupReveal)
            {
                var home = await db.Teams.FindAsync([match.HomeTeamId], ct);
                var away = await db.Teams.FindAsync([match.AwayTeamId], ct);
                var body = $"{home?.Name} vs {away?.Name} — confirmed XI is available";

                if (match.SimulationGroupId is { } simGroupId)
                    await push.SendToGroupAsync(simGroupId, "📋 Lineups are out!", body, ct,
                        $"/groups/{simGroupId}/match/{match.Id}");
                else
                    await push.SendToMatchGroupsAsync(match.Id, "📋 Lineups are out!", body, ct);

                match.MarkLineupRevealNotified();
                logger.LogInformation("Lineup-reveal notification sent for match {Id}", match.Id);
            }
            await db.SaveChangesAsync(ct);
        }

        // 3a. Poll real WC matches that are live, or about to / have just kicked off.
        // We begin a few minutes before kickoff and keep polling NS fixtures until the API
        // reports the real status: that's when "NS" flips to "1H" (start) and we notify.
        // The live cadence then carries the match through goals, HT, FT. An NS kickoff that
        // already passed (missed start) is still picked up within MissedStartWindow.
        var pollDue = now - LivePollInterval;
        var pollFrom = now - MissedStartWindow;   // catch-up floor for a missed start
        var pollUntil = now + KickoffLeadTime;    // start a few minutes before kickoff
        var liveReal = await db.Matches
            .Where(m => m.Source == "ApiFootball"
                && !m.IsFinished
                && m.LastSyncedAt <= pollDue
                && (
                    m.Status == "1H" || m.Status == "HT" || m.Status == "2H" || m.Status == "ET" || m.Status == "P"
                    || (m.Status == "NS" && m.KickoffUtc <= pollUntil && m.KickoffUtc > pollFrom)
                ))
            .ToListAsync(ct);

        foreach (var match in liveReal)
        {
            var poll = scope.ServiceProvider.GetRequiredService<PollLiveMatch>();
            await poll.ExecuteAsync(match.Id, ct);
            await Task.Delay(300, ct);
        }

        // 3b. Step simulation matches (kickoff reached OR already live)
        var simMatches = await db.Matches
            .Where(m => m.Source == "Simulation"
                && !m.IsFinished
                && m.KickoffUtc <= now          // kickoff has passed
                && m.LastSyncedAt <= now.AddMinutes(-1))  // step every ~1 min
            .ToListAsync(ct);

        foreach (var match in simMatches)
        {
            var step = scope.ServiceProvider.GetRequiredService<SimulateMatchStep>();
            await step.ExecuteAsync(match.Id, ct);
        }

        // 4. Finalize real WC finished matches
        var toFinalize = await db.Matches
            .Where(m => (m.Status == "FT" || m.Status == "AET" || m.Status == "PEN")
                && !m.IsFinished
                && m.Source == "ApiFootball")
            .ToListAsync(ct);

        foreach (var match in toFinalize)
        {
            logger.LogInformation("Finalizing match {Id}", match.Id);
            var finalize = scope.ServiceProvider.GetRequiredService<FinalizeMatch>();
            await finalize.ExecuteAsync(match.Id, ct);
        }

        // 5. After any real match finishes, refresh tournament standings + the two teams'
        // statistics (a match changes both). One standings call + two stats calls per match.
        if (toFinalize.Count > 0)
        {
            var syncStandings = scope.ServiceProvider.GetRequiredService<UseCases.Tournament.SyncStandings>();
            await syncStandings.ExecuteAsync(ct);

            var syncTopScorers = scope.ServiceProvider.GetRequiredService<UseCases.Tournament.SyncTopScorers>();
            await syncTopScorers.ExecuteAsync(ct);

            var syncStats = scope.ServiceProvider.GetRequiredService<UseCases.Tournament.SyncTeamStatistics>();
            var teamIds = toFinalize.SelectMany(m => new[] { m.HomeTeamId, m.AwayTeamId }).Distinct();
            foreach (var teamId in teamIds)
            {
                await syncStats.ExecuteAsync(teamId, ct);
                await Task.Delay(300, ct);
            }
        }
    }
}
