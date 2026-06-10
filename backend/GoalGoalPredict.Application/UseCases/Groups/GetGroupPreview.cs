using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Groups;

public class GetGroupPreview(IGroupRepository groups)
{
    public async Task<GroupPreviewDto?> ExecuteAsync(string inviteCode)
    {
        var group = await groups.GetByInviteCodeAsync(inviteCode.ToUpperInvariant());
        if (group is null) return null;

        var members = await groups.GetMembersAsync(group.Id);
        return new GroupPreviewDto(group.Id, group.Name, members.Count);
    }
}
