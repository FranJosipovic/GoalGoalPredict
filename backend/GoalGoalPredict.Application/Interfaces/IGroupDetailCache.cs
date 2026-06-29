using GoalGoalPredict.Application.DTOs;

namespace GoalGoalPredict.Application.Interfaces;

/// <summary>
/// In-memory, per-group cache for the group-detail (members) route, mirroring
/// <see cref="ILeaderboardCache"/>. Reads populate it lazily; any write that changes a
/// group's name, invite code, membership, member names, or member roles must evict it.
/// No TTL → a missed eviction leaves that group stale until the next one.
/// Backed by IMemoryCache → single backend instance only (see Program.cs).
/// </summary>
public interface IGroupDetailCache
{
    /// <summary>Returns the cached group detail, or runs <paramref name="factory"/> and caches it.</summary>
    Task<GroupDetailDto> GetOrAddAsync(Guid groupId, Func<Task<GroupDetailDto>> factory);

    /// <summary>Drops the cached detail for one group. No-op if nothing is cached.</summary>
    void Invalidate(Guid groupId);

    /// <summary>Drops the cached detail for several groups (e.g. a renamed user in many groups).</summary>
    void Invalidate(IEnumerable<Guid> groupIds);
}
