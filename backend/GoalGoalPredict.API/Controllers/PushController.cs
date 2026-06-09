using System.Security.Claims;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/push")]
[Authorize]
public class PushController(AppDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("vapid-public-key")]
    public IActionResult GetPublicKey([FromServices] IConfiguration config)
        => Ok(new { publicKey = config["Push:VapidPublicKey"] ?? "" });

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscribeBody body, CancellationToken ct)
    {
        var existing = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.Endpoint == body.Endpoint, ct);

        if (existing is null)
            db.PushSubscriptions.Add(PushSubscription.Create(UserId, body.Endpoint, body.P256dh, body.Auth));

        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete("subscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeBody body, CancellationToken ct)
    {
        var sub = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.Endpoint == body.Endpoint, ct);

        if (sub is not null)
        {
            db.PushSubscriptions.Remove(sub);
            await db.SaveChangesAsync(ct);
        }

        return Ok();
    }

    // Removes every push subscription for the current user (all devices / stale rows).
    // Used by the toggle's "disable" so the account is fully opted out.
    [HttpDelete("all")]
    public async Task<IActionResult> UnsubscribeAll(CancellationToken ct)
    {
        await db.PushSubscriptions.Where(s => s.UserId == UserId).ExecuteDeleteAsync(ct);
        return Ok();
    }
}

public record PushSubscribeBody(string Endpoint, string P256dh, string Auth);
public record UnsubscribeBody(string Endpoint);
