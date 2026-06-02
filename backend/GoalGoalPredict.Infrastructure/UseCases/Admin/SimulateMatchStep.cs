using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using GoalGoalPredict.Infrastructure.UseCases.Matches;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Admin;

public class SimulateMatchStep(
    AppDbContext db,
    PushNotificationService push,
    FinalizeMatch finalize,
    ILogger<SimulateMatchStep> logger)
{
    // Halftime pause: 5 real minutes = 5 wall-clock minutes after 45 game minutes
    private const int HalfTimePauseMinutes = 5;

    public async Task ExecuteAsync(int matchId, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([matchId], ct);
        if (match is null || match.IsFinished) return;

        var wallElapsed = (DateTime.UtcNow - match.KickoffUtc).TotalMinutes;

        // Calculate effective game minute accounting for HT pause
        string newStatus;
        int gameMinute;

        if (wallElapsed < 0)
            return; // not started yet

        if (wallElapsed <= 45)
        {
            newStatus = "1H";
            gameMinute = (int)wallElapsed;
        }
        else if (wallElapsed <= 45 + HalfTimePauseMinutes)
        {
            newStatus = "HT";
            gameMinute = 45;
        }
        else if (wallElapsed <= 90 + HalfTimePauseMinutes)
        {
            newStatus = "2H";
            gameMinute = (int)(wallElapsed - HalfTimePauseMinutes);
        }
        else
        {
            newStatus = "FT";
            gameMinute = 90;
        }

        var statusChanged = match.Status != newStatus;

        // Process unprocessed events up to current game minute
        var pending = await db.SimulationEvents
            .Include(e => e.Player)
            .Where(e => e.MatchId == matchId && !e.IsProcessed && e.Minute <= gameMinute)
            .OrderBy(e => e.Minute)
            .ToListAsync(ct);

        // Seed the order once from the DB; new goals aren't saved yet, so a per-iteration
        // CountAsync would return the same value and collide on (match_id, api_event_order).
        var order = await db.MatchGoals.CountAsync(g => g.MatchId == matchId, ct);

        var newGoals = new List<MatchGoal>();
        foreach (var e in pending)
        {
            var goal = MatchGoal.Create(
                matchId, e.PlayerId, e.TeamId, e.Minute, null, e.GoalType, order);
            db.MatchGoals.Add(goal);
            newGoals.Add(goal);
            order++;
            e.MarkProcessed();

            logger.LogInformation("Sim match {Id}: goal by {Player} at {Min}'", matchId, e.Player.Name, e.Minute);
        }

        // Recalculate score from all goals. The DB query won't include the goals we just
        // added (not yet saved), so concat them in — otherwise the score lags a goal behind
        // and notifications would announce a goal with a stale (e.g. 0-0) scoreline.
        var allGoals = (await db.MatchGoals.Where(g => g.MatchId == matchId).ToListAsync(ct))
            .Concat(newGoals).ToList();
        int homeGoals = allGoals.Count(g => g.TeamId == match.HomeTeamId && g.GoalType != "Own Goal")
                      + allGoals.Count(g => g.TeamId == match.AwayTeamId && g.GoalType == "Own Goal");
        int awayGoals = allGoals.Count(g => g.TeamId == match.AwayTeamId && g.GoalType != "Own Goal")
                      + allGoals.Count(g => g.TeamId == match.HomeTeamId && g.GoalType == "Own Goal");

        match.UpdateFromApi(newStatus, gameMinute, homeGoals, awayGoals, null, null, null, null);
        await db.SaveChangesAsync(ct);

        var matchUrl = match.SimulationGroupId.HasValue
            ? $"/groups/{match.SimulationGroupId.Value}/match/{matchId}"
            : null;

        // Push notifications
        if (pending.Count > 0 && match.SimulationGroupId.HasValue)
        {
            var homeTeam = await db.Teams.FindAsync([match.HomeTeamId], ct);
            var awayTeam = await db.Teams.FindAsync([match.AwayTeamId], ct);

            foreach (var e in pending.Where(e => e.GoalType != "Own Goal"))
            {
                await push.SendToGroupAsync(
                    match.SimulationGroupId.Value,
                    $"⚽ GOAL! {e.Player.Name} {e.Minute}'",
                    $"{homeTeam?.Name} {homeGoals} - {awayGoals} {awayTeam?.Name}",
                    ct, matchUrl);
            }
        }

        if (statusChanged && match.SimulationGroupId.HasValue)
        {
            var homeTeam = await db.Teams.FindAsync([match.HomeTeamId], ct);
            var awayTeam = await db.Teams.FindAsync([match.AwayTeamId], ct);

            var msg = newStatus switch
            {
                "1H" => ($"🏈 Kick off!", $"{homeTeam?.Name} vs {awayTeam?.Name}"),
                "HT" => ($"⏸ Half time", $"{homeTeam?.Name} {homeGoals} - {awayGoals} {awayTeam?.Name}"),
                "2H" => ($"▶️ Second half started", $"{homeTeam?.Name} vs {awayTeam?.Name}"),
                "FT" => ($"🏁 Full time!", $"{homeTeam?.Name} {homeGoals} - {awayGoals} {awayTeam?.Name}"),
                _ => (null, null)
            };

            if (msg.Item1 is not null)
                await push.SendToGroupAsync(match.SimulationGroupId.Value, msg.Item1, msg.Item2!, ct, matchUrl);
        }

        // Finalize when FT
        if (newStatus == "FT" && !match.IsFinished)
            await finalize.ExecuteAsync(matchId, ct);

        match.TouchSyncedAt();
        await db.SaveChangesAsync(ct);
    }
}
