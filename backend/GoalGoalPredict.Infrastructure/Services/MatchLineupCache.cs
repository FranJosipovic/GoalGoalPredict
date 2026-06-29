using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace GoalGoalPredict.Infrastructure.Services;

/// <summary>IMemoryCache-backed <see cref="IMatchLineupCache"/>. Registered as a singleton.</summary>
public class MatchLineupCache(IMemoryCache cache) : IMatchLineupCache
{
    private static string Key(int matchId) => $"match-lineup:{matchId}";

    public async Task<List<LineupPlayerDto>> GetOrAddAsync(int matchId, Func<Task<List<LineupPlayerDto>>> factory)
    {
        if (cache.TryGetValue(Key(matchId), out List<LineupPlayerDto>? cached) && cached is not null)
            return cached;

        var fresh = await factory();
        cache.Set(Key(matchId), fresh);
        return fresh;
    }

    public void Invalidate(int matchId) => cache.Remove(Key(matchId));
}
