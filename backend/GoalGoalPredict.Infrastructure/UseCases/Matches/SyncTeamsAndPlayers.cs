using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class SyncTeamsAndPlayers(AppDbContext db, IApiFootballClient api, ILogger<SyncTeamsAndPlayers> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        logger.LogInformation("Syncing teams...");
        var teams = await api.GetTeamsAsync(ct);

        foreach (var t in teams)
        {
            var existing = await db.Teams.FindAsync([t.Id], ct);
            if (existing is null)
                db.Teams.Add(Team.FromApi(t.Id, t.Name, t.Code, t.Country, t.LogoUrl));
            else
                existing.Update(t.Name, t.Code, t.Country, t.LogoUrl);
        }
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Synced {Count} teams", teams.Count);

        logger.LogInformation("Syncing squads for {Count} teams...", teams.Count);
        foreach (var team in teams)
        {
            await Task.Delay(200, ct);
            var players = await api.GetSquadAsync(team.Id, ct);
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
        }
        logger.LogInformation("Squad sync complete");
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
