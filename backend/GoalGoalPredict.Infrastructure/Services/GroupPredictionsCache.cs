using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace GoalGoalPredict.Infrastructure.Services;

/// <summary>IMemoryCache-backed <see cref="IGroupPredictionsCache"/>. Registered as a singleton.</summary>
public class GroupPredictionsCache(IMemoryCache cache) : IGroupPredictionsCache
{
    // Backstop for the membership-change case we don't evict precisely (kick/remove member fans
    // out across all of a group's matches). Short enough that a removed member's pick can't linger.
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    private static string Key(int matchId, Guid groupId) => $"group-predictions:{matchId}:{groupId}";

    public bool TryGet(int matchId, Guid groupId, out GroupPredictionsDto? dto) =>
        cache.TryGetValue(Key(matchId, groupId), out dto) && dto is not null;

    public void Set(int matchId, Guid groupId, GroupPredictionsDto dto) =>
        cache.Set(Key(matchId, groupId), dto, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = Ttl });

    public void Invalidate(int matchId, IEnumerable<Guid> groupIds)
    {
        foreach (var gid in groupIds)
            cache.Remove(Key(matchId, gid));
    }
}
