using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace GoalGoalPredict.Infrastructure.Services;

/// <summary>IMemoryCache-backed <see cref="IMatchDetailCache"/>. Registered as a singleton.</summary>
public class MatchDetailCache(IMemoryCache cache) : IMatchDetailCache
{
    private static string Key(int matchId) => $"match-detail:{matchId}";

    public bool TryGet(int matchId, out MatchDetailDto? dto) =>
        cache.TryGetValue(Key(matchId), out dto) && dto is not null;

    public void Set(int matchId, MatchDetailDto dto, TimeSpan? expiresAfter = null)
    {
        if (expiresAfter is { } ttl)
            cache.Set(Key(matchId), dto, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
        else
            cache.Set(Key(matchId), dto);
    }

    public void Invalidate(int matchId) => cache.Remove(Key(matchId));
}
