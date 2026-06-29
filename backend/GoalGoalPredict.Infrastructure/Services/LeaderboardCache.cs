using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace GoalGoalPredict.Infrastructure.Services;

/// <summary>IMemoryCache-backed <see cref="ILeaderboardCache"/>. Registered as a singleton.</summary>
public class LeaderboardCache(IMemoryCache cache) : ILeaderboardCache
{
    private static string Key(Guid groupId) => $"leaderboard:{groupId}";

    public async Task<List<LeaderboardEntryDto>> GetOrAddAsync(Guid groupId, Func<Task<List<LeaderboardEntryDto>>> factory)
    {
        if (cache.TryGetValue(Key(groupId), out List<LeaderboardEntryDto>? cached) && cached is not null)
            return cached;

        var fresh = await factory();
        cache.Set(Key(groupId), fresh);
        return fresh;
    }

    public void Invalidate(Guid groupId) => cache.Remove(Key(groupId));

    public void Invalidate(IEnumerable<Guid> groupIds)
    {
        foreach (var id in groupIds)
            cache.Remove(Key(id));
    }
}
