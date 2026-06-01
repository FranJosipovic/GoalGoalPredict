using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class PollLiveMatch(AppDbContext db, IApiFootballClient api, ILogger<PollLiveMatch> logger)
{
    public async Task ExecuteAsync(int matchId, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([matchId], ct);
        if (match is null) return;

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

        match.TouchSyncedAt();
        await db.SaveChangesAsync(ct);
        logger.LogDebug("Polled match {MatchId}: {Status} {Home}-{Away}", matchId, match.Status, match.HomeGoals, match.AwayGoals);
    }
}
