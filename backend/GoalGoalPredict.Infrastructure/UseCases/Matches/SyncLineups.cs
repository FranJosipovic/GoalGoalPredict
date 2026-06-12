using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class SyncLineups(AppDbContext db, IApiFootballClient api, ILogger<SyncLineups> logger)
{
    public async Task ExecuteAsync(int matchId, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([matchId], ct);
        if (match is null || match.LineupsAvailable) return;

        logger.LogInformation("Fetching lineups for match {MatchId}", matchId);
        var players = await api.GetLineupsAsync(matchId, ct);

        if (players.Count == 0)
        {
            logger.LogInformation("No lineups available yet for match {MatchId}", matchId);
            return;
        }

        // A lineup can reference players not yet in our squad data (incomplete squads).
        // MatchLineupPlayer.Player is a non-nullable FK, so an unknown id fails the insert.
        // Fetch the squad for any team with a missing player so we can store them by name.
        var known = await EnsurePlayersExistAsync(players, ct);

        var existing = await db.MatchLineupPlayers.Where(l => l.MatchId == matchId).ToListAsync(ct);
        db.MatchLineupPlayers.RemoveRange(existing);

        var skipped = 0;
        foreach (var p in players)
        {
            if (!known.Contains(p.PlayerId)) { skipped++; continue; }  // squad still doesn't list them
            db.MatchLineupPlayers.Add(MatchLineupPlayer.Create(matchId, p.TeamId, p.PlayerId, p.IsStarting, p.Position, p.ShirtNumber));
        }

        match.SetLineupsAvailable();
        await db.SaveChangesAsync(ct);
        if (skipped > 0)
            logger.LogWarning("Match {MatchId}: skipped {Skipped} lineup player(s) missing from the API squad", matchId, skipped);
        logger.LogInformation("Lineups saved for match {MatchId}: {Count} players", matchId, players.Count - skipped);
    }

    // Makes sure every player referenced by the lineup exists in our Players table, fetching
    // the squad on demand for any team with a missing player. Returns the ids that exist
    // afterwards. Runs its own SaveChanges, so call it before staging the lineup rows.
    private async Task<HashSet<int>> EnsurePlayersExistAsync(List<ApiLineupPlayerData> lineup, CancellationToken ct)
    {
        var ids = lineup.Select(p => p.PlayerId).ToHashSet();
        var known = await db.Players.Where(p => ids.Contains(p.Id)).Select(p => p.Id).ToHashSetAsync(ct);

        var teamsToFetch = lineup.Where(p => !known.Contains(p.PlayerId)).Select(p => p.TeamId).Distinct().ToList();
        if (teamsToFetch.Count == 0) return known;

        foreach (var teamId in teamsToFetch)
        {
            List<ApiSquadPlayerData> squad;
            try { squad = await api.GetSquadAsync(teamId, ct); }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Squad fetch failed for team {TeamId} while resolving lineup players", teamId);
                continue;
            }

            foreach (var sp in squad)
            {
                var pos = MapPosition(sp.Position);
                var existing = await db.Players.FindAsync([sp.Id], ct);
                if (existing is null)
                    db.Players.Add(Player.FromApi(sp.Id, teamId, sp.Name, sp.Age, sp.Number, pos, sp.PhotoUrl));
                else
                    existing.Update(sp.Name, sp.Age, sp.Number, pos, sp.PhotoUrl);
            }
            logger.LogInformation("Fetched squad for team {TeamId} to resolve missing lineup player(s)", teamId);
        }

        await db.SaveChangesAsync(ct);
        return await db.Players.Where(p => ids.Contains(p.Id)).Select(p => p.Id).ToHashSetAsync(ct);
    }

    private static PlayerPosition MapPosition(string pos) => pos switch
    {
        "Goalkeeper" => PlayerPosition.Goalkeeper,
        "Defender" => PlayerPosition.Defender,
        "Midfielder" => PlayerPosition.Midfielder,
        "Attacker" => PlayerPosition.Attacker,
        _ => PlayerPosition.Midfielder
    };
}
