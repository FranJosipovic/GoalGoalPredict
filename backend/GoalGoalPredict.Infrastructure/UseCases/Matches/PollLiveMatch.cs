using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class PollLiveMatch(AppDbContext db, IApiFootballClient api, EffectiveRulesService effectiveRules, ILogger<PollLiveMatch> logger)
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

        foreach (var e in goalEvents.Where(e => !existingOrders.Contains(e.Order)))
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
    }
}
