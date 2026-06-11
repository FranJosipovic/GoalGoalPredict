using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class PollLiveMatch(AppDbContext db, IApiFootballClient api, EffectiveRulesService effectiveRules, PushNotificationService push, ILogger<PollLiveMatch> logger)
{
    public async Task ExecuteAsync(int matchId, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([matchId], ct);
        if (match is null) return;

        // Freeze scoring-rules snapshots at kickoff for every group predicting on this match.
        var participatingGroups = await db.Predictions
            .Where(p => p.MatchId == matchId)
            .Select(p => p.GroupId)
            .Distinct()
            .ToListAsync(ct);
        foreach (var gid in participatingGroups)
            await effectiveRules.EnsureSnapshotAsync(gid, match, ct);

        var prevStatus = match.Status;

        var fixture = await api.GetFixtureAsync(matchId, ct);
        if (fixture is not null)
            match.UpdateFromApi(fixture.Status, fixture.ElapsedMinutes,
                fixture.HomeGoals, fixture.AwayGoals,
                fixture.EtHomeGoals, fixture.EtAwayGoals,
                fixture.PenHomeGoals, fixture.PenAwayGoals);

        var goalEvents = await api.GetGoalEventsAsync(matchId, ct);
        var existingOrders = await db.MatchGoals
            .Where(g => g.MatchId == matchId)
            .Select(g => g.ApiEventOrder)
            .ToHashSetAsync(ct);

        var newGoalEvents = goalEvents.Where(e => !existingOrders.Contains(e.Order)).ToList();
        foreach (var e in newGoalEvents)
            db.MatchGoals.Add(MatchGoal.Create(matchId, e.ScorerPlayerId, e.TeamId, e.Minute, e.ExtraMinute, e.GoalType, e.Order));

        var cardEvents = await api.GetCardEventsAsync(matchId, ct);
        var existingCardOrders = await db.MatchCards
            .Where(c => c.MatchId == matchId)
            .Select(c => c.ApiEventOrder)
            .ToHashSetAsync(ct);

        foreach (var e in cardEvents.Where(e => !existingCardOrders.Contains(e.Order)))
            db.MatchCards.Add(MatchCard.Create(matchId, e.PlayerId, e.TeamId, e.Minute, e.ExtraMinute, e.CardType, e.Order));

        match.TouchSyncedAt();
        await db.SaveChangesAsync(ct);
        logger.LogDebug("Polled match {MatchId}: {Status} {Home}-{Away}", matchId, match.Status, match.HomeGoals, match.AwayGoals);

        await SendNotificationsAsync(match, prevStatus, newGoalEvents, ct);
    }

    // Mirror the simulation match notifications (goals + status changes) for real matches,
    // fanned out to every group predicting this fixture.
    private async Task SendNotificationsAsync(Domain.Entities.Match match, string prevStatus,
        List<Application.Interfaces.ApiGoalEventData> newGoalEvents, CancellationToken ct)
    {
        var home = await db.Teams.FindAsync([match.HomeTeamId], ct);
        var away = await db.Teams.FindAsync([match.AwayTeamId], ct);
        var scoreline = $"{home?.Name} {match.HomeGoals ?? 0} - {match.AwayGoals ?? 0} {away?.Name}";

        // Goals — real scored goals only (not own goals or missed penalties), like sims.
        foreach (var e in newGoalEvents.Where(e => e.GoalType is "Normal Goal" or "Penalty"))
        {
            var scorer = await db.Players.FindAsync([e.ScorerPlayerId], ct);
            await push.SendToMatchGroupsAsync(match.Id,
                $"⚽ GOAL! {scorer?.Name ?? "Goal"} {e.Minute}'", scoreline, ct);
        }

        // Status transitions — kickoff / half time / second half / extra time / full time.
        if (prevStatus != match.Status)
        {
            var (title, body) = match.Status switch
            {
                "1H" => ("🏈 Kick off!", $"{home?.Name} vs {away?.Name}"),
                "HT" => ("⏸ Half time", scoreline),
                "2H" => ("▶️ Second half started", $"{home?.Name} vs {away?.Name}"),
                "ET" => ("⏱ Extra time", scoreline),
                "P"  => ("🎯 Penalty shootout", scoreline),
                "FT" or "AET" or "PEN" => ("🏁 Full time!", scoreline),
                _ => (null, (string?)null),
            };
            if (title is not null)
                await push.SendToMatchGroupsAsync(match.Id, title, body!, ct);
        }
    }
}
