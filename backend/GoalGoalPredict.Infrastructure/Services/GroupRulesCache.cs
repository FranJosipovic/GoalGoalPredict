using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace GoalGoalPredict.Infrastructure.Services;

/// <summary>IMemoryCache-backed <see cref="IGroupRulesCache"/>. Registered as a singleton.</summary>
public class GroupRulesCache(IMemoryCache cache) : IGroupRulesCache
{
    private static string Key(Guid groupId) => $"group-rules:{groupId}";

    public async Task<GroupScoringRulesDto> GetOrAddAsync(Guid groupId, Func<Task<GroupScoringRulesDto>> factory)
    {
        if (cache.TryGetValue(Key(groupId), out GroupScoringRulesDto? cached) && cached is not null)
            return cached;

        var fresh = await factory();
        cache.Set(Key(groupId), fresh);
        return fresh;
    }

    public void Invalidate(Guid groupId) => cache.Remove(Key(groupId));
}
