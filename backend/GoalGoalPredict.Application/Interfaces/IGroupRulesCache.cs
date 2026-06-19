using GoalGoalPredict.Application.DTOs;

namespace GoalGoalPredict.Application.Interfaces;

/// <summary>
/// In-memory, per-group cache for the live scoring-rules route, mirroring the other group
/// caches. The cached DTO holds the per-group rule values only; the per-user <c>CanEdit</c>
/// flag is stamped on each request, never cached. Evicted whenever the rules change.
/// No TTL → a missed eviction leaves that group's rules stale until the next one.
/// Backed by IMemoryCache → single backend instance only (see Program.cs).
/// </summary>
public interface IGroupRulesCache
{
    /// <summary>Returns the cached rules DTO for the group, or runs <paramref name="factory"/> and caches it.</summary>
    Task<GroupScoringRulesDto> GetOrAddAsync(Guid groupId, Func<Task<GroupScoringRulesDto>> factory);

    /// <summary>Drops the cached rules for one group. No-op if nothing is cached.</summary>
    void Invalidate(Guid groupId);
}
