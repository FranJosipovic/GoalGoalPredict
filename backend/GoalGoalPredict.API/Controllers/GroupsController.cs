using System.Security.Claims;
using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.UseCases.Groups;
using GoalGoalPredict.Infrastructure.UseCases.Groups;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController(
    CreateGroup createGroup,
    JoinGroup joinGroup,
    GetMyGroups getMyGroups,
    GetGroupDetail getGroupDetail,
    GetGroupPreview getGroupPreview,
    ResetInviteCode resetInviteCode,
    GroupRulesUseCase groupRules,
    KickGroupMember kickMember) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGroupRequest req)
    {
        var result = await createGroup.ExecuteAsync(new CreateGroupInput(req.Name, CurrentUserId));
        return Ok(result.Group);
    }

    [HttpPost("join")]
    public async Task<IActionResult> Join([FromBody] JoinGroupRequest req)
    {
        try
        {
            var result = await joinGroup.ExecuteAsync(new JoinGroupInput(req.InviteCode, CurrentUserId));
            return Ok(result.Group);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("preview/{code}")]
    [AllowAnonymous]
    public async Task<IActionResult> Preview(string code)
    {
        var preview = await getGroupPreview.ExecuteAsync(code);
        if (preview is null) return NotFound(new { error = "Invalid invite link." });
        return Ok(preview);
    }

    [HttpPost("{id:guid}/invite/reset")]
    public async Task<IActionResult> ResetInvite(Guid id)
    {
        try
        {
            var result = await resetInviteCode.ExecuteAsync(id, CurrentUserId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var result = await getMyGroups.ExecuteAsync(CurrentUserId);
        return Ok(result.Groups);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDetail(Guid id)
    {
        try
        {
            var result = await getGroupDetail.ExecuteAsync(id, CurrentUserId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken ct)
    {
        var result = await kickMember.ExecuteAsync(id, CurrentUserId, userId, ct);
        return result.Success ? Ok(new { result.Message }) : BadRequest(new { error = result.Message });
    }

    [HttpGet("{id:guid}/rules")]
    public async Task<IActionResult> GetRules(Guid id, CancellationToken ct)
    {
        var result = await groupRules.GetAsync(id, CurrentUserId, ct);
        if (result is null) return NotFound(new { error = "Group not found" });
        return Ok(result);
    }

    [HttpPut("{id:guid}/rules")]
    public async Task<IActionResult> UpdateRules(Guid id, [FromBody] UpdateGroupRulesRequest req, CancellationToken ct)
    {
        var (result, error) = await groupRules.UpdateAsync(id, CurrentUserId, req, ct);
        if (error is not null) return BadRequest(new { error });
        return Ok(result);
    }
}

public record CreateGroupRequest(string Name);
public record JoinGroupRequest(string InviteCode);
