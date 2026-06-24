using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Infrastructure.UseCases.Guest;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/guest")]
[AllowAnonymous]
public class GuestController(GuestPredictions guest) : ControllerBase
{
    // The nearest upcoming real match + default rules + both squads, for the landing-page predictor.
    [HttpGet("next-match")]
    public async Task<IActionResult> NextMatch(CancellationToken ct)
    {
        var result = await guest.GetNextMatchAsync(ct);
        if (result is null) return NotFound(new { error = "No upcoming match available." });
        return Ok(result);
    }

    [HttpPost("predict")]
    public async Task<IActionResult> Predict([FromBody] GuestPredictRequest req, CancellationToken ct)
    {
        var (ok, error) = await guest.SubmitAsync(req, ct);
        return ok ? Ok(new { message = "Prediction saved — we'll email your result." })
                  : BadRequest(new { error });
    }
}
