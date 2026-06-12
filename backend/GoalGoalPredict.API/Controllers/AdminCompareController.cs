using GoalGoalPredict.API.Filters;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/admin/compare")]
[Authorize]
[AdminOnly]
public class AdminCompareController(AdminCompareService compare) : ControllerBase
{
    [HttpGet("teams")]
    public async Task<IActionResult> Teams(CancellationToken ct)
        => Ok(await compare.CompareTeamsAsync(ct));

    [HttpGet("fixtures")]
    public async Task<IActionResult> Fixtures(CancellationToken ct)
        => Ok(await compare.CompareFixturesAsync(ct));

    // teamId optional — omit to walk every team (slow, throttled for API rate limits).
    [HttpGet("players")]
    public async Task<IActionResult> Players([FromQuery] int? teamId, CancellationToken ct)
        => Ok(await compare.ComparePlayersAsync(teamId, ct));

    // Per-match event diff (goals / cards / subs): what's stored in our DB vs what the
    // API currently returns. Rows flagged InDb/InApi so disallowed (extra-in-DB) events
    // and missing (in-API-only) events are obvious at a glance.
    [HttpGet("matches/{id:int}/events")]
    public async Task<IActionResult> MatchEvents(int id, CancellationToken ct)
        => Ok(await compare.CompareMatchEventsAsync(id, ct));
}
