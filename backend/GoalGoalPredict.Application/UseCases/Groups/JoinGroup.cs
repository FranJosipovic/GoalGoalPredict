using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.UseCases.Groups;

public record JoinGroupInput(string InviteCode, Guid UserId);
public record JoinGroupOutput(GroupDto Group);

public class JoinGroup(IGroupRepository groups, ILeaderboardCache leaderboardCache)
{
    public async Task<JoinGroupOutput> ExecuteAsync(JoinGroupInput input)
    {
        var group = await groups.GetByInviteCodeAsync(input.InviteCode.ToUpperInvariant());
        if (group is null)
            throw new InvalidOperationException("Invalid invite code.");

        var alreadyMember = await groups.IsMemberAsync(group.Id, input.UserId);
        if (alreadyMember)
            throw new InvalidOperationException("You are already a member of this group.");

        var member = new GroupMember(group.Id, input.UserId, GroupRole.Member);
        await groups.AddMemberAsync(member);

        // New member joins the leaderboard → drop this group's cached entry.
        leaderboardCache.Invalidate(group.Id);

        return new JoinGroupOutput(new GroupDto(group.Id, group.Name, group.InviteCode, group.CreatedByUserId, group.CreatedAt));
    }
}
