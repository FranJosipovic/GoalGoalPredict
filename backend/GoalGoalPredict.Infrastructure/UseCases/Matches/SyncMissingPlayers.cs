using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class SyncMissingPlayers(AppDbContext db, IApiFootballClient api, ILogger<SyncMissingPlayers> logger)
{
    public async Task<int> ExecuteAsync(CancellationToken ct = default)
    {
        var teamsWithPlayers = await db.Players
            .Select(p => p.TeamId)
            .Distinct()
            .ToHashSetAsync(ct);

        var missingTeams = await db.Teams
            .Where(t => !teamsWithPlayers.Contains(t.Id))
            .ToListAsync(ct);

        if (missingTeams.Count == 0)
        {
            logger.LogInformation("All teams already have players");
            return 0;
        }

        logger.LogInformation("Syncing players for {Count} teams with no players: {Teams}",
            missingTeams.Count,
            string.Join(", ", missingTeams.Select(t => t.Name)));

        int totalAdded = 0;
        foreach (var team in missingTeams)
        {
            await Task.Delay(250, ct);
            var players = await api.GetSquadAsync(team.Id, ct);

            if (players.Count == 0)
            {
                logger.LogWarning("No players returned for {Team} (id={Id})", team.Name, team.Id);
                continue;
            }

            foreach (var p in players)
            {
                var pos = MapPosition(p.Position);
                var existing = await db.Players.FindAsync([p.Id], ct);
                if (existing is null)
                    db.Players.Add(Player.FromApi(p.Id, team.Id, p.Name, p.Age, p.Number, pos, p.PhotoUrl));
                else
                    existing.Update(p.Name, p.Age, p.Number, pos, p.PhotoUrl);
            }

            await db.SaveChangesAsync(ct);
            totalAdded += players.Count;
            logger.LogInformation("Synced {Count} players for {Team}", players.Count, team.Name);
        }

        return totalAdded;
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
