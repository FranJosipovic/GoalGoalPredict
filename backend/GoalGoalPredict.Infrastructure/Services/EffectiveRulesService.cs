using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.Services;

/// <summary>
/// Resolves which scoring rules apply. Owners can edit the *live* rules at any time, but each
/// match's scoring is frozen at kickoff: once a match starts, a snapshot of the rules is taken
/// and used for that match forever, so later edits only affect matches that haven't kicked off.
/// Snapshots are stored as <see cref="GroupScoringRules"/> rows with a non-null MatchId.
/// </summary>
public class EffectiveRulesService(AppDbContext db)
{
    /// The live, owner-editable rules for a group (MatchId == null).
    public async Task<GroupScoringRules> GetLiveAsync(Guid groupId, CancellationToken ct = default) =>
        await db.GroupScoringRules.FirstOrDefaultAsync(r => r.GroupId == groupId && r.MatchId == null, ct)
        ?? GroupScoringRules.CreateDefault(groupId);

    /// <summary>
    /// Rules to score a match with. Upcoming match → current live rules. Started match → the
    /// frozen kickoff snapshot. When <paramref name="createIfMissing"/> is set and the match has
    /// started without a snapshot yet, one is frozen from the current live rules and persisted.
    /// </summary>
    public async Task<GroupScoringRules> GetForMatchAsync(Guid groupId, Match match, bool createIfMissing, CancellationToken ct = default)
    {
        if (match.KickoffUtc > DateTime.UtcNow)
            return await GetLiveAsync(groupId, ct);

        var snapshot = await db.GroupScoringRules.FirstOrDefaultAsync(r => r.GroupId == groupId && r.MatchId == match.Id, ct);
        if (snapshot is not null) return snapshot;

        var live = await GetLiveAsync(groupId, ct);
        if (!createIfMissing) return live;

        snapshot = live.CloneForMatch(match.Id);
        db.GroupScoringRules.Add(snapshot);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Lost a race to create the snapshot — load the winner.
            db.Entry(snapshot).State = EntityState.Detached;
            snapshot = await db.GroupScoringRules.FirstAsync(r => r.GroupId == groupId && r.MatchId == match.Id, ct);
        }
        return snapshot;
    }

    /// Ensure a kickoff snapshot exists for a started match (called by the live pollers so the
    /// freeze happens at kickoff, before any later rule edit).
    public async Task EnsureSnapshotAsync(Guid groupId, Match match, CancellationToken ct = default)
    {
        if (match.KickoffUtc > DateTime.UtcNow) return;
        await GetForMatchAsync(groupId, match, createIfMissing: true, ct);
    }
}
