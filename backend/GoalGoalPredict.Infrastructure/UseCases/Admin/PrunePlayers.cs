using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Admin;

// Removes "extra in DB" players — those no longer in the API squad — but only when
// nothing references them (predictions, lineups, goals, cards, simulation events).
// Players still in use are kept and reported as skipped.
public class PrunePlayers(AppDbContext db, IApiFootballClient api, ILogger<PrunePlayers> logger)
{
    public record PruneSkip(int PlayerId, string Name, string Reason);
    public record PruneResult(int TeamsProcessed, int Removed, List<PruneSkip> Skipped, List<int> SkippedTeams);

    public async Task<PruneResult> ExecuteAsync(int? teamId, CancellationToken ct = default)
    {
        var teams = teamId.HasValue
            ? await db.Teams.Where(t => t.Id == teamId).Select(t => t.Id).ToListAsync(ct)
            : await db.Teams.OrderBy(t => t.Id).Select(t => t.Id).ToListAsync(ct);

        int removed = 0, processed = 0;
        var skipped = new List<PruneSkip>();
        var skippedTeams = new List<int>();

        foreach (var tid in teams)
        {
            ct.ThrowIfCancellationRequested();
            if (teamId is null) await Task.Delay(250, ct); // throttle bulk walk

            List<ApiSquadPlayerData> apiPlayers;
            try { apiPlayers = await api.GetSquadAsync(tid, ct); }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Squad fetch failed for team {TeamId}; skipping prune", tid);
                skippedTeams.Add(tid);
                continue;
            }

            // Safety: never treat the whole squad as extra if the API returned nothing.
            if (apiPlayers.Count == 0) { skippedTeams.Add(tid); continue; }
            processed++;

            var apiIds = apiPlayers.Select(p => p.Id).ToHashSet();
            var extra = await db.Players.AsNoTracking()
                .Where(p => p.TeamId == tid && !apiIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name })
                .ToListAsync(ct);
            if (extra.Count == 0) continue;

            var ids = extra.Select(p => p.Id).ToList();
            var referenced = await CollectReferencedAsync(ids, ct);

            var toRemove = ids.Where(id => !referenced.Contains(id)).ToList();
            foreach (var p in extra.Where(p => referenced.Contains(p.Id)))
                skipped.Add(new PruneSkip(p.Id, p.Name, "In use (predictions/match data)"));

            if (toRemove.Count > 0)
            {
                var n = await db.Players.Where(p => toRemove.Contains(p.Id)).ExecuteDeleteAsync(ct);
                removed += n;
                logger.LogInformation("Pruned {Count} extra players from team {TeamId}", n, tid);
            }
        }

        return new PruneResult(processed, removed, skipped, skippedTeams);
    }

    // Hard-deletes a single player, but only if nothing references them.
    public async Task<AdminActionResult> DeleteOneAsync(int playerId, CancellationToken ct = default)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId, ct);
        if (player is null) return new(false, "Player not found");

        var referenced = await CollectReferencedAsync([playerId], ct);
        if (referenced.Contains(playerId))
            return new(false, "Player is referenced by predictions/match data — deactivate instead");

        await db.Players.Where(p => p.Id == playerId).ExecuteDeleteAsync(ct);
        return new(true, $"Player '{player.Name}' removed");
    }

    private async Task<HashSet<int>> CollectReferencedAsync(List<int> ids, CancellationToken ct)
    {
        var referenced = new HashSet<int>();
        referenced.UnionWith(await db.GoalscorerPredictions.Where(g => ids.Contains(g.PlayerId)).Select(g => g.PlayerId).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.CardPredictions.Where(c => ids.Contains(c.PlayerId)).Select(c => c.PlayerId).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.MatchLineupPlayers.Where(l => ids.Contains(l.PlayerId)).Select(l => l.PlayerId).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.MatchGoals.Where(g => g.ScorerPlayerId != null && ids.Contains(g.ScorerPlayerId.Value)).Select(g => g.ScorerPlayerId!.Value).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.MatchCards.Where(c => c.PlayerId != null && ids.Contains(c.PlayerId.Value)).Select(c => c.PlayerId!.Value).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.SimulationEvents.Where(s => ids.Contains(s.PlayerId)).Select(s => s.PlayerId).Distinct().ToListAsync(ct));
        return referenced;
    }
}
