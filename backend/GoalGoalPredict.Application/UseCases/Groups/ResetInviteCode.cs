using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Groups;

public class ResetInviteCode(IGroupRepository groups, IGroupDetailCache groupDetailCache)
{
    public async Task<GroupDto> ExecuteAsync(Guid groupId, Guid requestingUserId)
    {
        var group = await groups.GetByIdAsync(groupId)
            ?? throw new InvalidOperationException("Group not found.");

        if (group.CreatedByUserId != requestingUserId)
            throw new UnauthorizedAccessException("Only the group owner can reset the invite link.");

        group.RegenerateInviteCode();
        await groups.UpdateGroupAsync(group);

        // Invite code is part of the group-detail payload → drop the members cache. (Leaderboard unaffected.)
        groupDetailCache.Invalidate(groupId);

        return new GroupDto(group.Id, group.Name, group.InviteCode, group.CreatedByUserId, group.CreatedAt);
    }
}
