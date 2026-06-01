using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.UseCases.Matches;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(
    SyncTeamsAndPlayers syncTeams,
    SyncFixtures syncFixtures,
    SyncMissingPlayers syncMissingPlayers,
    AppDbContext db) : ControllerBase
{
    [HttpPost("sync-teams-players")]
    public async Task<IActionResult> SyncTeamsAndPlayers(CancellationToken ct)
    {
        await syncTeams.ExecuteAsync(ct);
        return Ok(new { message = "Teams and players synced" });
    }

    [HttpPost("sync-missing-players")]
    public async Task<IActionResult> SyncMissingPlayers(CancellationToken ct)
    {
        var added = await syncMissingPlayers.ExecuteAsync(ct);
        return Ok(new { message = $"Synced {added} players for teams with missing squads" });
    }

    [HttpPost("sync-fixtures")]
    public async Task<IActionResult> SyncFixtures(CancellationToken ct)
    {
        await syncFixtures.ExecuteAsync(ct);
        return Ok(new { message = "Fixtures synced" });
    }

    [HttpGet("status")]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        var teamCount = await db.Teams.CountAsync(ct);
        var playerCount = await db.Players.CountAsync(ct);
        var matchCount = await db.Matches.CountAsync(ct);
        var teamsWithoutPlayers = await db.Teams
            .Where(t => !db.Players.Any(p => p.TeamId == t.Id))
            .Select(t => new { t.Id, t.Name })
            .ToListAsync(ct);

        return Ok(new { teamCount, playerCount, matchCount, teamsWithoutPlayers });
    }
}
