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

        var existing = await db.MatchLineupPlayers.Where(l => l.MatchId == matchId).ToListAsync(ct);
        db.MatchLineupPlayers.RemoveRange(existing);

        foreach (var p in players)
            db.MatchLineupPlayers.Add(MatchLineupPlayer.Create(matchId, p.TeamId, p.PlayerId, p.IsStarting, p.Position, p.ShirtNumber));

        match.SetLineupsAvailable();
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Lineups saved for match {MatchId}: {Count} players", matchId, players.Count);
    }
}
