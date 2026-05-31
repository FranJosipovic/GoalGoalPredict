using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.Interfaces;

public interface IGroupRepository
{
    Task<Group?> GetByIdAsync(Guid id);
    Task<Group?> GetByInviteCodeAsync(string inviteCode);
    Task<List<Group>> GetByUserIdAsync(Guid userId);
    Task<List<GroupMember>> GetMembersAsync(Guid groupId);
    Task AddGroupAsync(Group group);
    Task AddMemberAsync(GroupMember member);
    Task<bool> IsMemberAsync(Guid groupId, Guid userId);
}
