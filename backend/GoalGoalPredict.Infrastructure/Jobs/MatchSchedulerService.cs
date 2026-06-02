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

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await Task.Delay(TimeSpan.FromSeconds(10), ct);

        while (!ct.IsCancellationRequested)
        {
            try { await RunCycleAsync(ct); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogError(ex, "Scheduler cycle error"); }

            await Task.Delay(TimeSpan.FromSeconds(60), ct);
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

        // 2b. Notify once when lineups become visible (30 min before kickoff, sim matches).
        var lineupReveal = await db.Matches
            .Where(m => m.Source == "Simulation"
                && m.Status == "NS"
                && m.LineupsAvailable
                && !m.LineupRevealNotified
                && m.SimulationGroupId != null
                && m.KickoffUtc <= now.AddMinutes(30)   // reveal window reached
                && m.KickoffUtc > now)                  // not yet kicked off
            .ToListAsync(ct);

        if (lineupReveal.Count > 0)
        {
            var push = scope.ServiceProvider.GetRequiredService<Services.PushNotificationService>();
            foreach (var match in lineupReveal)
            {
                var home = await db.Teams.FindAsync([match.HomeTeamId], ct);
                var away = await db.Teams.FindAsync([match.AwayTeamId], ct);
                await push.SendToGroupAsync(
                    match.SimulationGroupId!.Value,
                    "📋 Lineups are out!",
                    $"{home?.Name} vs {away?.Name} — confirmed XI is available",
                    ct, $"/groups/{match.SimulationGroupId.Value}/match/{match.Id}");
                match.MarkLineupRevealNotified();
                logger.LogInformation("Lineup-reveal notification sent for match {Id}", match.Id);
            }
            await db.SaveChangesAsync(ct);
        }

        // 3a. Poll real WC live matches (every 3 min)
        var liveReal = await db.Matches
            .Where(m => (m.Status == "1H" || m.Status == "HT" || m.Status == "2H" || m.Status == "ET" || m.Status == "P")
                && m.Source == "ApiFootball"
                && m.LastSyncedAt <= now.AddMinutes(-3))
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
    }
}
