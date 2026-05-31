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
            .Select(g => new GroupDto(g.Id, g.Name, g.InviteCode, g.CreatedByUserId, g.CreatedAt))
            .ToList();
        return new GetMyGroupsOutput(dtos);
    }
}
