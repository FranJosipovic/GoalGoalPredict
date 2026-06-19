using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace GoalGoalPredict.Infrastructure.Services;

/// <summary>IMemoryCache-backed <see cref="IGroupDetailCache"/>. Registered as a singleton.</summary>
public class GroupDetailCache(IMemoryCache cache) : IGroupDetailCache
{
    private static string Key(Guid groupId) => $"group-detail:{groupId}";

    public async Task<GroupDetailDto> GetOrAddAsync(Guid groupId, Func<Task<GroupDetailDto>> factory)
    {
        if (cache.TryGetValue(Key(groupId), out GroupDetailDto? cached) && cached is not null)
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
