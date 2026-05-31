using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Groups;

public class GetGroupDetail(IGroupRepository groups, IUserRepository users)
{
    public async Task<GroupDetailDto> ExecuteAsync(Guid groupId, Guid requestingUserId)
    {
        var group = await groups.GetByIdAsync(groupId)
            ?? throw new InvalidOperationException("Group not found.");

        var isMember = await groups.IsMemberAsync(groupId, requestingUserId);
        if (!isMember)
            throw new UnauthorizedAccessException("You are not a member of this group.");

        var members = await groups.GetMembersAsync(groupId);
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
