using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.UseCases.Groups;

public record CreateGroupInput(string Name, Guid UserId);
public record CreateGroupOutput(GroupDto Group);

public class CreateGroup(IGroupRepository groups)
{
    public async Task<CreateGroupOutput> ExecuteAsync(CreateGroupInput input)
    {
        var group = new Group(input.Name, input.UserId);
        await groups.AddGroupAsync(group);

        var owner = new GroupMember(group.Id, input.UserId, GroupRole.Owner);
        await groups.AddMemberAsync(owner);

        await groups.AddScoringRulesAsync(GroupScoringRules.CreateDefault(group.Id));

        return new CreateGroupOutput(new GroupDto(group.Id, group.Name, group.InviteCode, group.CreatedByUserId, group.CreatedAt));
    }
}
