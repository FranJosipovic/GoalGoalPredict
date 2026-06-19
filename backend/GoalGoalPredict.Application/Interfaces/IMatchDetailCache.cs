using GoalGoalPredict.Application.DTOs;

namespace GoalGoalPredict.Application.Interfaces;

/// <summary>
/// In-memory cache for the match-detail route (lineups + goals/cards/subs/VAR), keyed by matchId.
/// Cached from the moment lineups are revealed (covers the pre-kickoff predicting window, live
/// play, and the post-match browse peak); NOT cached before reveal, since lineupsRevealed would be
/// stored false and then be wrong once the reveal time passes. The payload has no per-user data, so
/// one entry is shared by every user. Evicted whenever the server changes the match — every
/// PollLiveMatch (events/score) and SyncLineups (lineup). Finished entries are immutable but get a
/// short absolute expiry to reclaim RAM once browsing dies down. Otherwise no TTL.
/// Backed by IMemoryCache → single backend instance only (see Program.cs).
/// </summary>
public interface IMatchDetailCache
{
    /// <summary>True (with the cached DTO) if this match's detail is cached.</summary>
    bool TryGet(int matchId, out MatchDetailDto? dto);

    /// <summary>Stores a match's detail. Pass <paramref name="expiresAfter"/> for finished matches to reclaim RAM.</summary>
    void Set(int matchId, MatchDetailDto dto, TimeSpan? expiresAfter = null);

    /// <summary>Drops the cached detail for one match. No-op if nothing is cached.</summary>
    void Invalidate(int matchId);
}
