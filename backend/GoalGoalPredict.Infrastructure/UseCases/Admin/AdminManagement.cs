using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Admin;

public record AdminActionResult(bool Success, string Message);

// Deletes a full group and everything that depends on it. For simulation groups this
// also removes the group's matches; real (ApiFootball) matches are shared and left intact.
public class DeleteGroup(AppDbContext db, ILeaderboardCache leaderboardCache, IGroupDetailCache groupDetailCache)
{
    public async Task<AdminActionResult> ExecuteAsync(Guid groupId, CancellationToken ct = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == groupId, ct);
        if (group is null) return new(false, "Group not found");

        var predIds = db.Predictions.Where(p => p.GroupId == groupId).Select(p => p.Id);
        await db.GoalscorerPredictions.Where(g => predIds.Contains(g.PredictionId)).ExecuteDeleteAsync(ct);
        await db.CardPredictions.Where(c => predIds.Contains(c.PredictionId)).ExecuteDeleteAsync(ct);
        await db.PredictionScores.Where(s => s.GroupId == groupId).ExecuteDeleteAsync(ct);
        await db.Predictions.Where(p => p.GroupId == groupId).ExecuteDeleteAsync(ct);
        await db.GroupScoringRules.Where(r => r.GroupId == groupId).ExecuteDeleteAsync(ct);
        await db.GroupMembers.Where(m => m.GroupId == groupId).ExecuteDeleteAsync(ct);

        if (group.IsSimulation)
        {
            var matchIds = db.Matches.Where(m => m.SimulationGroupId == groupId).Select(m => m.Id);
            await db.MatchLineupPlayers.Where(l => matchIds.Contains(l.MatchId)).ExecuteDeleteAsync(ct);
            await db.MatchGoals.Where(g => matchIds.Contains(g.MatchId)).ExecuteDeleteAsync(ct);
            await db.MatchCards.Where(c => matchIds.Contains(c.MatchId)).ExecuteDeleteAsync(ct);
            await db.SimulationEvents.Where(e => matchIds.Contains(e.MatchId)).ExecuteDeleteAsync(ct);
            await db.Matches.Where(m => m.SimulationGroupId == groupId).ExecuteDeleteAsync(ct);
        }

        await db.Groups.Where(g => g.Id == groupId).ExecuteDeleteAsync(ct);

        // Group gone → drop its leaderboard and members caches.
        leaderboardCache.Invalidate(groupId);
        groupDetailCache.Invalidate(groupId);
        return new(true, $"Group '{group.Name}' deleted");
    }
}

// Deletes a user and their personal data. Refuses if the user still owns any group —
// the admin must transfer ownership or delete those groups first.
public class DeleteUser(AppDbContext db, ILeaderboardCache leaderboardCache, IGroupDetailCache groupDetailCache)
{
    public async Task<AdminActionResult> ExecuteAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return new(false, "User not found");

        var ownedGroups = await db.Groups.CountAsync(g => g.CreatedByUserId == userId, ct);
        if (ownedGroups > 0)
            return new(false, $"User owns {ownedGroups} group(s). Transfer ownership or delete those groups first.");

        // Capture the user's groups before deleting their memberships, so we know which to evict.
        var affectedGroupIds = await db.GroupMembers.Where(m => m.UserId == userId).Select(m => m.GroupId).ToListAsync(ct);

        var predIds = db.Predictions.Where(p => p.UserId == userId).Select(p => p.Id);
        await db.GoalscorerPredictions.Where(g => predIds.Contains(g.PredictionId)).ExecuteDeleteAsync(ct);
        await db.CardPredictions.Where(c => predIds.Contains(c.PredictionId)).ExecuteDeleteAsync(ct);
        await db.PredictionScores.Where(s => s.UserId == userId).ExecuteDeleteAsync(ct);
        await db.Predictions.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await db.GroupMembers.Where(m => m.UserId == userId).ExecuteDeleteAsync(ct);
        await db.PushSubscriptions.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(ct);

        // User left every group they were in → drop those groups' leaderboard and members caches.
        leaderboardCache.Invalidate(affectedGroupIds);
        groupDetailCache.Invalidate(affectedGroupIds);
        return new(true, $"User '{user.Email}' deleted");
    }
}

// Removes a member from a group (and their predictions/scores in that group).
// The owner cannot be removed — ownership must be transferred first.
public class RemoveGroupMember(AppDbContext db, ILeaderboardCache leaderboardCache, IGroupDetailCache groupDetailCache)
{
    public async Task<AdminActionResult> ExecuteAsync(Guid groupId, Guid userId, CancellationToken ct = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == groupId, ct);
        if (group is null) return new(false, "Group not found");
        if (group.CreatedByUserId == userId)
            return new(false, "Cannot remove the group owner. Transfer ownership first.");

        var member = await db.GroupMembers.FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == userId, ct);
        if (member is null) return new(false, "User is not a member of this group");

        var predIds = db.Predictions.Where(p => p.GroupId == groupId && p.UserId == userId).Select(p => p.Id);
        await db.GoalscorerPredictions.Where(g => predIds.Contains(g.PredictionId)).ExecuteDeleteAsync(ct);
        await db.CardPredictions.Where(c => predIds.Contains(c.PredictionId)).ExecuteDeleteAsync(ct);
        await db.PredictionScores.Where(s => s.GroupId == groupId && s.UserId == userId).ExecuteDeleteAsync(ct);
        await db.Predictions.Where(p => p.GroupId == groupId && p.UserId == userId).ExecuteDeleteAsync(ct);
        await db.GroupMembers.Where(m => m.GroupId == groupId && m.UserId == userId).ExecuteDeleteAsync(ct);

        // Member (and their scores) gone → drop this group's leaderboard and members caches.
        leaderboardCache.Invalidate(groupId);
        groupDetailCache.Invalidate(groupId);
        return new(true, "Member removed");
    }
}

// Transfers group ownership to another existing member, swapping the Owner/Member roles.
public class TransferGroupOwner(AppDbContext db, IGroupDetailCache groupDetailCache)
{
    public async Task<AdminActionResult> ExecuteAsync(Guid groupId, Guid newOwnerUserId, CancellationToken ct = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == groupId, ct);
        if (group is null) return new(false, "Group not found");
        if (group.CreatedByUserId == newOwnerUserId) return new(false, "User is already the owner");

        var newOwner = await db.GroupMembers.FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == newOwnerUserId, ct);
        if (newOwner is null) return new(false, "New owner must be a member of the group");

        var oldOwner = await db.GroupMembers.FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == group.CreatedByUserId, ct);

        group.TransferOwnership(newOwnerUserId);
        newOwner.ChangeRole(GroupRole.Owner);
        oldOwner?.ChangeRole(GroupRole.Member);

        await db.SaveChangesAsync(ct);

        // Member roles changed (Owner/Member) → drop the members cache. Leaderboard is unaffected.
        groupDetailCache.Invalidate(groupId);
        return new(true, "Ownership transferred");
    }
}
