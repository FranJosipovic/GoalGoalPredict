using GoalGoalPredict.API.Filters;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.UseCases.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.API.Controllers;

// Admin oversight of ALL groups (real + simulation), distinct from SimAdminController
// which only manages simulation groups.
[ApiController]
[Route("api/admin/all-groups")]
[Authorize]
[AdminOnly]
public class AdminGroupsAdminController(
    AppDbContext db,
    DeleteGroup deleteGroup,
    RemoveGroupMember removeMember,
    TransferGroupOwner transferOwner) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] string? type, CancellationToken ct)
    {
        var query = db.Groups.AsNoTracking().AsQueryable();
        if (type == "sim") query = query.Where(g => g.IsSimulation);
        else if (type == "real") query = query.Where(g => !g.IsSimulation);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(g => g.Name.ToLower().Contains(term) || g.InviteCode.ToLower().Contains(term));
        }

        var groups = await query
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new {
                g.Id, g.Name, g.InviteCode, g.IsSimulation, g.CreatedAt, g.CreatedByUserId,
                Owner = db.Users.Where(u => u.Id == g.CreatedByUserId)
                    .Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
                Members = db.GroupMembers.Count(m => m.GroupId == g.Id),
                Predictions = db.Predictions.Count(p => p.GroupId == g.Id),
                Matches = db.Matches.Count(m => m.SimulationGroupId == g.Id)
            })
            .ToListAsync(ct);

        return Ok(groups);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Detail(Guid id, CancellationToken ct)
    {
        var group = await db.Groups.AsNoTracking().FirstOrDefaultAsync(g => g.Id == id, ct);
        if (group is null) return NotFound();

        var members = await db.GroupMembers
            .Where(m => m.GroupId == id)
            .Join(db.Users, m => m.UserId, u => u.Id, (m, u) => new {
                u.Id, u.Email, u.FirstName, u.LastName, m.Role, m.JoinedAt,
                IsOwner = group.CreatedByUserId == u.Id,
                Points = db.PredictionScores.Where(s => s.GroupId == id && s.UserId == u.Id).Sum(s => (int?)s.TotalPoints) ?? 0,
                Predictions = db.Predictions.Count(p => p.GroupId == id && p.UserId == u.Id)
            })
            .OrderByDescending(m => m.Points)
            .ToListAsync(ct);

        return Ok(new {
            group.Id, group.Name, group.InviteCode, group.IsSimulation, group.CreatedAt, group.CreatedByUserId,
            members
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var result = await deleteGroup.ExecuteAsync(id, ct);
        return result.Success ? Ok(new { result.Message }) : BadRequest(new { result.Message });
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        var result = await removeMember.ExecuteAsync(id, userId, ct);
        return result.Success ? Ok(new { result.Message }) : BadRequest(new { result.Message });
    }

    [HttpPost("{id:guid}/transfer-owner")]
    public async Task<IActionResult> Transfer(Guid id, [FromBody] TransferOwnerBody body, CancellationToken ct)
    {
        var result = await transferOwner.ExecuteAsync(id, body.NewOwnerUserId, ct);
        return result.Success ? Ok(new { result.Message }) : BadRequest(new { result.Message });
    }
}

public record TransferOwnerBody(Guid NewOwnerUserId);
