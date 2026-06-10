using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Groups;

public class ResetInviteCode(IGroupRepository groups)
{
    public async Task<GroupDto> ExecuteAsync(Guid groupId, Guid requestingUserId)
    {
        var group = await groups.GetByIdAsync(groupId)
            ?? throw new InvalidOperationException("Group not found.");

        if (group.CreatedByUserId != requestingUserId)
            throw new UnauthorizedAccessException("Only the group owner can reset the invite link.");

        group.RegenerateInviteCode();
        await groups.UpdateGroupAsync(group);

        return new GroupDto(group.Id, group.Name, group.InviteCode, group.CreatedByUserId, group.CreatedAt);
    }
}
