using GoalGoalPredict.Application.DTOs;

namespace GoalGoalPredict.Application.Interfaces;

/// <summary>
/// In-memory cache for a match's starting XI + bench, keyed by matchId. Lineups don't change once
/// revealed (SyncLineups is a no-op after LineupsAvailable is set), so this is effectively
/// write-once and long-lived — deliberately decoupled from the per-poll match-detail eviction so
/// the heavy lineup join isn't re-run on every live poll. Shared across users; small payload.
/// Evicted only by SyncLineups (the one writer). Backed by IMemoryCache → single instance only.
/// </summary>
public interface IMatchLineupCache
{
    /// <summary>Returns the cached lineup for the match, or runs <paramref name="factory"/> and caches it.</summary>
    Task<List<LineupPlayerDto>> GetOrAddAsync(int matchId, Func<Task<List<LineupPlayerDto>>> factory);

    /// <summary>Drops the cached lineup for one match. No-op if nothing is cached.</summary>
    void Invalidate(int matchId);
}
