using GoalGoalPredict.Infrastructure.UseCases.Players;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/players")]
[Authorize]
public class PlayersController(GetPlayerStatistics getPlayerStats) : ControllerBase
{
    // Player season statistics, served from the DB cache (refreshed from API-Football
    // when the player's team has played since the last sync).
    [HttpGet("{id:int}/stats")]
    public async Task<IActionResult> GetStats(int id, CancellationToken ct)
    {
        var stats = await getPlayerStats.ExecuteAsync(id, ct);
        if (stats is null) return NotFound();
        return Ok(stats);
    }
}
