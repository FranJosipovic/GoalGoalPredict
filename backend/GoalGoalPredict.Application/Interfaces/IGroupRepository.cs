using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.Interfaces;

public interface IGroupRepository
{
    Task<Group?> GetByIdAsync(Guid id);
    Task<Group?> GetByInviteCodeAsync(string inviteCode);
    Task<List<Group>> GetByUserIdAsync(Guid userId);
    Task<List<GroupMember>> GetMembersAsync(Guid groupId);
    Task AddGroupAsync(Group group);
    Task UpdateGroupAsync(Group group);
    Task AddMemberAsync(GroupMember member);
    Task AddScoringRulesAsync(GroupScoringRules rules);
    Task<bool> IsMemberAsync(Guid groupId, Guid userId);
    Task<Group?> GetGlobalAsync();
    // Adds the user to the global group if one exists and they're not already a member (idempotent).
    Task EnsureGlobalMembershipAsync(Guid userId);
}
