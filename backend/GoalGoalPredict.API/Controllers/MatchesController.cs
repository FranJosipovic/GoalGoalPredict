using System.Security.Claims;
using GoalGoalPredict.Infrastructure.UseCases.Predictions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/matches")]
[Authorize]
public class MatchesController(GetMatches getMatches, GetGroupPredictions getGroupPredictions) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid groupId, CancellationToken ct)
    {
        var result = await getMatches.ExecuteAsync(UserId, groupId, ct);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDetail(int id, CancellationToken ct)
    {
        var result = await getMatches.GetDetailAsync(id, ct);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpGet("{id:int}/predictions")]
    public async Task<IActionResult> GetGroupPredictions(int id, [FromQuery] Guid groupId, CancellationToken ct)
    {
        var result = await getGroupPredictions.ExecuteAsync(id, groupId, ct);
        if (result is null) return NotFound();
        return Ok(result);
    }
}
