using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.Repositories;

public class GroupRepository(AppDbContext db) : IGroupRepository
{
    public async Task<Group?> GetByIdAsync(Guid id) =>
        await db.Groups.FindAsync(id);

    public async Task<Group?> GetByInviteCodeAsync(string inviteCode) =>
        await db.Groups.FirstOrDefaultAsync(g => g.InviteCode == inviteCode);

    public async Task<List<Group>> GetByUserIdAsync(Guid userId)
    {
        var groupIds = await db.GroupMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.GroupId)
            .ToListAsync();

        return await db.Groups.Where(g => groupIds.Contains(g.Id)).ToListAsync();
    }

    public async Task<List<GroupMember>> GetMembersAsync(Guid groupId) =>
        await db.GroupMembers.Where(m => m.GroupId == groupId).ToListAsync();

    public async Task AddGroupAsync(Group group)
    {
        db.Groups.Add(group);
        await db.SaveChangesAsync();
    }

    public async Task AddMemberAsync(GroupMember member)
    {
        db.GroupMembers.Add(member);
        await db.SaveChangesAsync();
    }

    public async Task<bool> IsMemberAsync(Guid groupId, Guid userId) =>
        await db.GroupMembers.AnyAsync(m => m.GroupId == groupId && m.UserId == userId);
}
