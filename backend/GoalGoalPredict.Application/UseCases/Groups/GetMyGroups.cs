using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Groups;

public record GetMyGroupsOutput(List<GroupDto> Groups);

public class GetMyGroups(IGroupRepository groups)
{
    public async Task<GetMyGroupsOutput> ExecuteAsync(Guid userId)
    {
        var groupList = await groups.GetByUserIdAsync(userId);
        var dtos = groupList
            // Global group always sits on top of the list.
            .OrderByDescending(g => g.IsGlobal)
            .ThenByDescending(g => g.CreatedAt)
            .Select(g => new GroupDto(g.Id, g.Name, g.InviteCode, g.CreatedByUserId, g.CreatedAt, g.IsGlobal, g.IsLocked))
            .ToList();
        return new GetMyGroupsOutput(dtos);
    }
}
