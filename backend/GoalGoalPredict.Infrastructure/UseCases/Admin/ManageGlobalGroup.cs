using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Admin;

public record GlobalGroupStatus(bool Exists, Guid? Id, string? Name, bool IsLocked, int MemberCount);

// Admin control for the single platform-wide "global" group: create it (backfilling every
// existing user as a member + default scoring rules) and lock/unlock it for the knockout phase.
public class ManageGlobalGroup(AppDbContext db, IGroupDetailCache groupDetailCache)
{
    private const string GlobalName = "Global Competition";

    public async Task<GlobalGroupStatus> GetStatusAsync(CancellationToken ct = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.IsGlobal, ct);
        if (group is null) return new GlobalGroupStatus(false, null, null, false, 0);
        var members = await db.GroupMembers.CountAsync(m => m.GroupId == group.Id, ct);
        return new GlobalGroupStatus(true, group.Id, group.Name, group.IsLocked, members);
    }

    // Idempotent: creates the global group with default rules if missing, then makes sure every
    // existing user has a membership row.
    public async Task<GlobalGroupStatus> EnsureAsync(CancellationToken ct = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.IsGlobal, ct);
        if (group is null)
        {
            group = Group.CreateGlobal(GlobalName);
            db.Groups.Add(group);
            db.GroupScoringRules.Add(GroupScoringRules.CreateDefault(group.Id));
            await db.SaveChangesAsync(ct);
        }

        var existingMemberIds = await db.GroupMembers
            .Where(m => m.GroupId == group.Id)
            .Select(m => m.UserId)
            .ToListAsync(ct);

        var missing = await db.Users
            .Where(u => !existingMemberIds.Contains(u.Id))
            .Select(u => u.Id)
            .ToListAsync(ct);

        foreach (var userId in missing)
            db.GroupMembers.Add(new GroupMember(group.Id, userId, GroupRole.Member));

        if (missing.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            groupDetailCache.Invalidate(group.Id);
        }

        return await GetStatusAsync(ct);
    }

    public async Task<GlobalGroupStatus> SetLockedAsync(bool locked, CancellationToken ct = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.IsGlobal, ct)
            ?? throw new InvalidOperationException("Global group does not exist yet.");
        group.SetLocked(locked);
        await db.SaveChangesAsync(ct);
        // Cached detail carries IsLocked → drop it so clients see the new state.
        groupDetailCache.Invalidate(group.Id);
        return await GetStatusAsync(ct);
    }
}
