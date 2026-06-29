using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

// Reconciles one team's squad against what API-Football currently returns: adds players that
// are missing in the DB and updates existing ones whose fields drifted (name/age/number/position/
// photo). Does NOT remove players no longer in the API — that's PrunePlayers' job, kept separate
// so a routine field-sync never deletes anything referenced by predictions/match data.
public class SyncSquad(AppDbContext db, IApiFootballClient api, ILogger<SyncSquad> logger)
{
    public record Result(int TeamId, int Added, int Updated, int ApiCount);

    public async Task<Result> ExecuteAsync(int teamId, CancellationToken ct = default)
    {
        var team = await db.Teams.FindAsync([teamId], ct)
            ?? throw new InvalidOperationException($"Team {teamId} not found.");

        var apiPlayers = await api.GetSquadAsync(teamId, ct);
        if (apiPlayers.Count == 0)
        {
            logger.LogWarning("No players returned from API for {Team} (id={Id})", team.Name, teamId);
            return new Result(teamId, 0, 0, 0);
        }

        int added = 0, updated = 0;
        foreach (var p in apiPlayers)
        {
            var pos = MapPosition(p.Position);
            var existing = await db.Players.FindAsync([p.Id], ct);
            if (existing is null)
            {
                db.Players.Add(Player.FromApi(p.Id, teamId, p.Name, p.Age, p.Number, pos, p.PhotoUrl));
                added++;
            }
            else if (existing.Name != p.Name || existing.Age != p.Age || existing.ShirtNumber != p.Number
                     || existing.Position != pos || existing.PhotoUrl != p.PhotoUrl || !existing.IsActive)
            {
                existing.Update(p.Name, p.Age, p.Number, pos, p.PhotoUrl);
                updated++;
            }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Squad sync for {Team}: {Added} added, {Updated} updated", team.Name, added, updated);
        return new Result(teamId, added, updated, apiPlayers.Count);
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
