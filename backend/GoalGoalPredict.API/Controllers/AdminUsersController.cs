using System.Security.Claims;
using GoalGoalPredict.API.Filters;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.UseCases.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize]
[AdminOnly]
public class AdminUsersController(AppDbContext db, DeleteUser deleteUser) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, CancellationToken ct)
    {
        var query = db.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(u =>
                u.Email.Contains(term) ||
                (u.FirstName + " " + u.LastName).ToLower().Contains(term));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new {
                u.Id, u.Email, u.FirstName, u.LastName, u.IsAdmin, u.CreatedAt,
                Groups = db.GroupMembers.Count(m => m.UserId == u.Id),
                Predictions = db.Predictions.Count(p => p.UserId == u.Id),
                HasPush = db.PushSubscriptions.Any(p => p.UserId == u.Id)
            })
            .ToListAsync(ct);

        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Detail(Guid id, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();

        var groups = await db.GroupMembers
            .Where(m => m.UserId == id)
            .Join(db.Groups, m => m.GroupId, g => g.Id, (m, g) => new {
                g.Id, g.Name, g.IsSimulation, m.Role,
                IsOwner = g.CreatedByUserId == id,
                Points = db.PredictionScores.Where(s => s.GroupId == g.Id && s.UserId == id).Sum(s => (int?)s.TotalPoints) ?? 0,
                Predictions = db.Predictions.Count(p => p.GroupId == g.Id && p.UserId == id)
            })
            .ToListAsync(ct);

        var pushCount = await db.PushSubscriptions.CountAsync(p => p.UserId == id, ct);
        var totalPoints = await db.PredictionScores.Where(s => s.UserId == id).SumAsync(s => (int?)s.TotalPoints, ct) ?? 0;
        var totalPredictions = await db.Predictions.CountAsync(p => p.UserId == id, ct);

        return Ok(new {
            user.Id, user.Email, user.FirstName, user.LastName, user.IsAdmin, user.CreatedAt,
            pushCount, totalPoints, totalPredictions, groups
        });
    }

    [HttpPost("{id:guid}/admin")]
    public async Task<IActionResult> SetAdmin(Guid id, [FromBody] SetAdminBody body, CancellationToken ct)
    {
        if (id == CurrentUserId && !body.IsAdmin)
            return BadRequest(new { message = "You cannot revoke your own admin access" });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();

        user.SetAdmin(body.IsAdmin);
        await db.SaveChangesAsync(ct);
        return Ok(new { user.Id, user.IsAdmin });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (id == CurrentUserId)
            return BadRequest(new { message = "You cannot delete your own account" });

        var result = await deleteUser.ExecuteAsync(id, ct);
        return result.Success ? Ok(new { result.Message }) : BadRequest(new { result.Message });
    }
}

public record SetAdminBody(bool IsAdmin);
