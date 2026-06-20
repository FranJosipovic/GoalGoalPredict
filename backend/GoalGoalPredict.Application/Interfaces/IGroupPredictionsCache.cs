using GoalGoalPredict.Application.DTOs;

namespace GoalGoalPredict.Application.Interfaces;

/// <summary>
/// In-memory cache for the "other members' picks" route, keyed by (matchId, groupId). The payload
/// is shared across a whole group (no per-user data) and only exists after kickoff, so it's scoped
/// to the match/post-match browse window. Projected points are computed live from the match's
/// current goals/cards, so it's evicted on every scoring change — PollLiveMatch (new events) and
/// FinalizeMatch / SyncMatchScoring (stored final scores). Entries also carry a short absolute TTL
/// as a backstop for the one change we don't evict precisely: a group member being removed (which
/// fans out across all of that group's matches). Backed by IMemoryCache → single instance only.
/// </summary>
public interface IGroupPredictionsCache
{
    /// <summary>True (with the cached DTO) if this (match, group)'s predictions are cached.</summary>
    bool TryGet(int matchId, Guid groupId, out GroupPredictionsDto? dto);

    /// <summary>Stores the predictions for a (match, group). A short TTL backstop is applied internally.</summary>
    void Set(int matchId, Guid groupId, GroupPredictionsDto dto);

    /// <summary>Drops the cached predictions for several groups of one match (e.g. after a poll/score change).</summary>
    void Invalidate(int matchId, IEnumerable<Guid> groupIds);
}
