using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.UseCases.Groups;

public class GetGroupDetail(IGroupRepository groups, IUserRepository users, IGroupDetailCache cache)
{
    public async Task<GroupDetailDto> ExecuteAsync(Guid groupId, Guid requestingUserId)
    {
        // Existence + membership are per-user/per-request → checked every call, never cached.
        var group = await groups.GetByIdAsync(groupId)
            ?? throw new InvalidOperationException("Group not found.");

        var isMember = await groups.IsMemberAsync(groupId, requestingUserId);
        if (!isMember)
            throw new UnauthorizedAccessException("You are not a member of this group.");

        // The detail payload is identical for every member → cache-aside by group.
        return await cache.GetOrAddAsync(groupId, () => BuildAsync(group));
    }

    private async Task<GroupDetailDto> BuildAsync(Group group)
    {
        var members = await groups.GetMembersAsync(group.Id);
        var memberDtos = new List<GroupMemberDto>();

        foreach (var member in members)
        {
            var user = await users.GetByIdAsync(member.UserId);
            if (user is not null)
                memberDtos.Add(new GroupMemberDto(user.Id, user.FirstName, user.LastName, user.Email, member.Role.ToString()));
        }

        return new GroupDetailDto(group.Id, group.Name, group.InviteCode, group.CreatedByUserId, group.CreatedAt, memberDtos);
    }
}
