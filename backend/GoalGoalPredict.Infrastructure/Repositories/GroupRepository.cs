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

        var groups = await db.Groups.Where(g => groupIds.Contains(g.Id)).ToListAsync();

        // The global group is everyone's group — surface it even if a membership row
        // hasn't been backfilled yet (e.g. created after this user signed up).
        if (!groups.Any(g => g.IsGlobal))
        {
            var global = await GetGlobalAsync();
            if (global is not null) groups.Add(global);
        }

        return groups;
    }

    public async Task<Group?> GetGlobalAsync() =>
        await db.Groups.FirstOrDefaultAsync(g => g.IsGlobal);

    public async Task EnsureGlobalMembershipAsync(Guid userId)
    {
        var global = await GetGlobalAsync();
        if (global is null) return;
        var already = await db.GroupMembers.AnyAsync(m => m.GroupId == global.Id && m.UserId == userId);
        if (already) return;
        db.GroupMembers.Add(new GroupMember(global.Id, userId, GroupRole.Member));
        await db.SaveChangesAsync();
    }

    public async Task<List<GroupMember>> GetMembersAsync(Guid groupId) =>
        await db.GroupMembers.Where(m => m.GroupId == groupId).ToListAsync();

    public async Task AddGroupAsync(Group group)
    {
        db.Groups.Add(group);
        await db.SaveChangesAsync();
    }

    public async Task UpdateGroupAsync(Group group)
    {
        db.Groups.Update(group);
        await db.SaveChangesAsync();
    }

    public async Task AddMemberAsync(GroupMember member)
    {
        db.GroupMembers.Add(member);
        await db.SaveChangesAsync();
    }

    public async Task AddScoringRulesAsync(GroupScoringRules rules)
    {
        db.GroupScoringRules.Add(rules);
        await db.SaveChangesAsync();
    }

    public async Task<bool> IsMemberAsync(Guid groupId, Guid userId) =>
        await db.GroupMembers.AnyAsync(m => m.GroupId == groupId && m.UserId == userId);
}
