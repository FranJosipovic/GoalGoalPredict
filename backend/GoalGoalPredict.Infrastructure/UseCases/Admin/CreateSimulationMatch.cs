using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Admin;

public record SimLineupPlayerInput(int PlayerId, string Position, int ShirtNumber);
public record SimEventInput(int PlayerId, int TeamId, int Minute, string GoalType);

public record CreateSimMatchRequest(
    Guid GroupId,
    int HomeTeamId,
    int AwayTeamId,
    DateTime KickoffUtc,
    string HomeFormation,
    string AwayFormation,
    List<SimLineupPlayerInput> HomeLineup,
    List<SimLineupPlayerInput> AwayLineup,
    List<SimEventInput> Events
);

public class CreateSimulationMatch(AppDbContext db)
{
    public async Task<Match> ExecuteAsync(CreateSimMatchRequest req, CancellationToken ct = default)
    {
        var group = await db.Groups.FindAsync([req.GroupId], ct)
            ?? throw new InvalidOperationException("Group not found");
        if (!group.IsSimulation) throw new InvalidOperationException("Group is not a simulation group");

        // Generate a unique negative ID for sim matches (to avoid collision with API IDs)
        var minId = await db.Matches.Where(m => m.Id < 0).MinAsync(m => (int?)m.Id, ct) ?? 0;
        var newId = minId - 1;

        var round = $"Simulation — {group.Name}";
        var match = Match.CreateSimulation(newId, req.HomeTeamId, req.AwayTeamId, req.KickoffUtc.ToUniversalTime(), round, req.GroupId);
        db.Matches.Add(match);
        await db.SaveChangesAsync(ct);

        // Home lineup
        foreach (var p in req.HomeLineup)
            db.MatchLineupPlayers.Add(MatchLineupPlayer.Create(newId, req.HomeTeamId, p.PlayerId, true, p.Position, p.ShirtNumber));

        // Away lineup
        foreach (var p in req.AwayLineup)
            db.MatchLineupPlayers.Add(MatchLineupPlayer.Create(newId, req.AwayTeamId, p.PlayerId, true, p.Position, p.ShirtNumber));

        // Pre-programmed events
        foreach (var e in req.Events)
            db.SimulationEvents.Add(SimulationEvent.Create(newId, e.PlayerId, e.TeamId, e.Minute, e.GoalType));

        await db.SaveChangesAsync(ct);
        return match;
    }
}
