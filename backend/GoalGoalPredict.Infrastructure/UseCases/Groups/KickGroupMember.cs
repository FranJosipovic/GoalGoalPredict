using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Groups;

public record KickResult(bool Success, string Message);

// Lets a group OWNER remove another member from their own group (and that member's
// predictions/scores in the group). Mirrors the admin RemoveGroupMember use case but
// authorises against the requesting user being the group owner.
public class KickGroupMember(AppDbContext db, ILeaderboardCache leaderboardCache, IGroupDetailCache groupDetailCache)
{
    public async Task<KickResult> ExecuteAsync(Guid groupId, Guid requestingUserId, Guid targetUserId, CancellationToken ct = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == groupId, ct);
        if (group is null) return new(false, "Group not found");
        if (group.CreatedByUserId != requestingUserId)
            return new(false, "Only the group owner can remove members");
        if (targetUserId == requestingUserId || targetUserId == group.CreatedByUserId)
            return new(false, "The owner cannot be removed");

        var member = await db.GroupMembers.FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == targetUserId, ct);
        if (member is null) return new(false, "User is not a member of this group");

        var predIds = db.Predictions.Where(p => p.GroupId == groupId && p.UserId == targetUserId).Select(p => p.Id);
        await db.GoalscorerPredictions.Where(g => predIds.Contains(g.PredictionId)).ExecuteDeleteAsync(ct);
        await db.CardPredictions.Where(c => predIds.Contains(c.PredictionId)).ExecuteDeleteAsync(ct);
        await db.PredictionScores.Where(s => s.GroupId == groupId && s.UserId == targetUserId).ExecuteDeleteAsync(ct);
        await db.Predictions.Where(p => p.GroupId == groupId && p.UserId == targetUserId).ExecuteDeleteAsync(ct);
        await db.GroupMembers.Where(m => m.GroupId == groupId && m.UserId == targetUserId).ExecuteDeleteAsync(ct);

        // Member (and their scores) gone → drop this group's leaderboard and members caches.
        leaderboardCache.Invalidate(groupId);
        groupDetailCache.Invalidate(groupId);
        return new(true, "Member removed");
    }
}
