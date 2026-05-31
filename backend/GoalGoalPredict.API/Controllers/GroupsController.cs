using System.Security.Claims;
using GoalGoalPredict.Application.UseCases.Groups;
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
    GetGroupDetail getGroupDetail) : ControllerBase
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
}

public record CreateGroupRequest(string Name);
public record JoinGroupRequest(string InviteCode);
