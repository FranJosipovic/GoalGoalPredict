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

        // Goals/cards are reconciled (not just appended) against the current API feed:
        // when VAR overturns an event, API-Football drops it from the feed, so we must
        // delete the now-stale row too — otherwise a disallowed goal lingers forever.
        // Identity is the event's natural key (team/player/minute/type), since the
        // positional Order shifts whenever an earlier event is added or removed.
        var goalEvents = await api.GetGoalEventsAsync(matchId, ct);
        var existingGoals = await db.MatchGoals.Where(g => g.MatchId == matchId).ToListAsync(ct);

        static (int, int?, int, int?, string) GoalKey(int teamId, int? player, int minute, int? extra, string type)
            => (teamId, player, minute, extra, type);
        var apiGoalKeys = goalEvents
            .Select(e => GoalKey(e.TeamId, e.ScorerPlayerId, e.Minute, e.ExtraMinute, e.GoalType))
            .ToHashSet();
        var dbGoalKeys = existingGoals
            .Select(g => GoalKey(g.TeamId, g.ScorerPlayerId, g.Minute, g.ExtraMinute, g.GoalType))
            .ToHashSet();

        var staleGoals = existingGoals
            .Where(g => !apiGoalKeys.Contains(GoalKey(g.TeamId, g.ScorerPlayerId, g.Minute, g.ExtraMinute, g.GoalType)))
            .ToList();
        if (staleGoals.Count > 0)
        {
            db.MatchGoals.RemoveRange(staleGoals);
            logger.LogInformation("Match {MatchId}: removed {Count} stale goal(s) no longer in API feed (e.g. VAR-disallowed)", matchId, staleGoals.Count);
        }

        var newGoalEvents = goalEvents
            .Where(e => !dbGoalKeys.Contains(GoalKey(e.TeamId, e.ScorerPlayerId, e.Minute, e.ExtraMinute, e.GoalType)))
            .ToList();

        var cardEvents = await api.GetCardEventsAsync(matchId, ct);
        var existingCards = await db.MatchCards.Where(c => c.MatchId == matchId).ToListAsync(ct);

        static (int, int?, int, int?, string) CardKey(int teamId, int? player, int minute, int? extra, string type)
            => (teamId, player, minute, extra, type);
        var apiCardKeys = cardEvents
            .Select(e => CardKey(e.TeamId, e.PlayerId, e.Minute, e.ExtraMinute, e.CardType))
            .ToHashSet();
        var dbCardKeys = existingCards
            .Select(c => CardKey(c.TeamId, c.PlayerId, c.Minute, c.ExtraMinute, c.CardType))
            .ToHashSet();

        var staleCards = existingCards
            .Where(c => !apiCardKeys.Contains(CardKey(c.TeamId, c.PlayerId, c.Minute, c.ExtraMinute, c.CardType)))
            .ToList();
        if (staleCards.Count > 0)
        {
            db.MatchCards.RemoveRange(staleCards);
            logger.LogInformation("Match {MatchId}: removed {Count} stale card(s) no longer in API feed", matchId, staleCards.Count);
        }

        // ApiEventOrder is only an identity/uniqueness artifact now (the timeline orders by
        // minute). Under reconcile it must stay unique per match, so hand new rows a value
        // strictly above any existing one rather than the API's positional index — which can
        // collide with a kept row when the feed shifts.
        var nextGoalOrder = existingGoals.Count == 0 ? 0 : existingGoals.Max(g => g.ApiEventOrder) + 1;
        foreach (var e in newGoalEvents)
            db.MatchGoals.Add(MatchGoal.Create(matchId, e.ScorerPlayerId, e.TeamId, e.Minute, e.ExtraMinute, e.GoalType, nextGoalOrder++));

        var newCardEvents = cardEvents
            .Where(e => !dbCardKeys.Contains(CardKey(e.TeamId, e.PlayerId, e.Minute, e.ExtraMinute, e.CardType)))
            .ToList();
        var nextCardOrder = existingCards.Count == 0 ? 0 : existingCards.Max(c => c.ApiEventOrder) + 1;
        foreach (var e in newCardEvents)
            db.MatchCards.Add(MatchCard.Create(matchId, e.PlayerId, e.TeamId, e.Minute, e.ExtraMinute, e.CardType, nextCardOrder++));

        // VAR decisions (type "Var", e.g. "Goal Disallowed - offside", "Penalty confirmed").
        // Reconciled like goals/cards but keyed without the player — the player id can be
        // nulled below when unknown, and team+minute+detail already identifies the decision.
        var varEvents = await api.GetVarEventsAsync(matchId, ct);
        var existingVars = await db.MatchVarDecisions.Where(v => v.MatchId == matchId).ToListAsync(ct);

        static (int, int, int?, string) VarKey(int teamId, int minute, int? extra, string detail)
            => (teamId, minute, extra, detail);
        var apiVarKeys = varEvents.Select(e => VarKey(e.TeamId, e.Minute, e.ExtraMinute, e.Detail)).ToHashSet();
        var dbVarKeys = existingVars.Select(v => VarKey(v.TeamId, v.Minute, v.ExtraMinute, v.Detail)).ToHashSet();

        var staleVars = existingVars
            .Where(v => !apiVarKeys.Contains(VarKey(v.TeamId, v.Minute, v.ExtraMinute, v.Detail)))
            .ToList();
        if (staleVars.Count > 0)
            db.MatchVarDecisions.RemoveRange(staleVars);

        var newVarEvents = varEvents
            .Where(e => !dbVarKeys.Contains(VarKey(e.TeamId, e.Minute, e.ExtraMinute, e.Detail)))
            .ToList();
        if (newVarEvents.Count > 0)
        {
            var varPlayerIds = newVarEvents.Where(e => e.PlayerId.HasValue).Select(e => e.PlayerId!.Value).Distinct().ToList();
            var knownVarPlayers = await db.Players.Where(p => varPlayerIds.Contains(p.Id)).Select(p => p.Id).ToHashSetAsync(ct);
            var nextVarOrder = existingVars.Count == 0 ? 0 : existingVars.Max(v => v.ApiEventOrder) + 1;
            foreach (var e in newVarEvents)
            {
                var pid = e.PlayerId is int vp && knownVarPlayers.Contains(vp) ? vp : (int?)null;
                db.MatchVarDecisions.Add(MatchVarDecision.Create(matchId, e.TeamId, pid, e.Minute, e.ExtraMinute, e.Detail, nextVarOrder++));
            }
        }

        var subEvents = await api.GetSubstitutionEventsAsync(matchId, ct);
        if (subEvents.Count > 0)
        {
            var existingSubOrders = await db.MatchSubstitutions
                .Where(s => s.MatchId == matchId)
                .Select(s => s.ApiEventOrder)
                .ToHashSetAsync(ct);

            // Bench players occasionally aren't in our Players table; null out unknown
            // ids so the FK insert doesn't fail (the name simply shows as "Unknown").
            var referencedIds = subEvents
                .SelectMany(e => new[] { e.PlayerInId, e.PlayerOutId })
                .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
            var knownPlayerIds = await db.Players
                .Where(p => referencedIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToHashSetAsync(ct);

            foreach (var e in subEvents.Where(e => !existingSubOrders.Contains(e.Order)))
            {
                var inId = e.PlayerInId is int pin && knownPlayerIds.Contains(pin) ? pin : (int?)null;
                var outId = e.PlayerOutId is int pout && knownPlayerIds.Contains(pout) ? pout : (int?)null;
                db.MatchSubstitutions.Add(MatchSubstitution.Create(matchId, e.TeamId, e.Minute, e.ExtraMinute, inId, outId, e.Order));
            }
        }

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
