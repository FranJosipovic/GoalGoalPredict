using System.Security.Claims;
using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Infrastructure.UseCases.Predictions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/predictions")]
[Authorize]
public class PredictionsController(UpsertPrediction upsert, GetGroupLeaderboard leaderboard, GetMyPrediction getMyPrediction, GetMyPredictions getMyPredictions) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("my")]
    public async Task<IActionResult> GetMy([FromQuery] int matchId, [FromQuery] Guid groupId, CancellationToken ct)
    {
        var result = await getMyPrediction.ExecuteAsync(UserId, matchId, groupId, ct);
        if (result is null) return NoContent();
        return Ok(result);
    }

    // Prediction made for this match in another group (earliest one), offered for copying.
    [HttpGet("copyable")]
    public async Task<IActionResult> GetCopyable([FromQuery] int matchId, [FromQuery] Guid groupId, CancellationToken ct)
    {
        var result = await getMyPrediction.GetCopyableAsync(UserId, matchId, groupId, ct);
        if (result is null) return NoContent();
        return Ok(result);
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine([FromQuery] Guid groupId, CancellationToken ct)
    {
        var result = await getMyPredictions.ExecuteAsync(UserId, groupId, onlyStarted: false, ct);
        return Ok(result);
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetForUser(Guid userId, [FromQuery] Guid groupId, CancellationToken ct)
    {
        // Own history shows everything; other members only after kickoff.
        var onlyStarted = userId != UserId;
        var result = await getMyPredictions.ExecuteAsync(userId, groupId, onlyStarted, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertPredictionRequest request, CancellationToken ct)
    {
        var (result, error) = await upsert.ExecuteAsync(UserId, request, ct);
        if (error is not null) return BadRequest(new { error });
        return Ok(result);
    }

    [HttpGet("leaderboard")]
    public async Task<IActionResult> GetLeaderboard([FromQuery] Guid groupId, CancellationToken ct)
    {
        var result = await leaderboard.ExecuteAsync(groupId, ct);
        return Ok(result);
    }
}
