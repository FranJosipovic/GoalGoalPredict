using GoalGoalPredict.Application.DTOs;

namespace GoalGoalPredict.Application.Interfaces;

/// <summary>
/// In-memory, per-group leaderboard cache (cache-aside). Reads populate it lazily;
/// any write that changes a group's scores, membership, or member names must evict it.
/// There is no TTL, so a missed eviction means that group stays stale until the next one.
/// Backed by IMemoryCache → single backend instance only (see Program.cs).
/// </summary>
public interface ILeaderboardCache
{
    /// <summary>Returns the cached leaderboard for the group, or runs <paramref name="factory"/> and caches it.</summary>
    Task<List<LeaderboardEntryDto>> GetOrAddAsync(Guid groupId, Func<Task<List<LeaderboardEntryDto>>> factory);

    /// <summary>Drops the cached leaderboard for one group. No-op if nothing is cached.</summary>
    void Invalidate(Guid groupId);

    /// <summary>Drops the cached leaderboards for several groups (e.g. a match scored across many groups).</summary>
    void Invalidate(IEnumerable<Guid> groupIds);
}
