using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetGroupLeaderboard(AppDbContext db, ILeaderboardCache cache)
{
    // Cache-aside: serve the cached leaderboard if present, otherwise run the query and cache it.
    public Task<List<LeaderboardEntryDto>> ExecuteAsync(Guid groupId, CancellationToken ct = default) =>
        cache.GetOrAddAsync(groupId, () => QueryAsync(groupId, ct));

    private async Task<List<LeaderboardEntryDto>> QueryAsync(Guid groupId, CancellationToken ct)
    {
        var memberIds = await db.GroupMembers
            .Where(m => m.GroupId == groupId)
            .Select(m => m.UserId)
            .ToListAsync(ct);

        var users = await db.Users
            .Where(u => memberIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        var scores = await db.PredictionScores
            .Where(s => s.GroupId == groupId && memberIds.Contains(s.UserId))
            .GroupBy(s => s.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Total = g.Sum(s => s.TotalPoints),
                Exact = g.Sum(s => s.ExactScorePoints),
                Outcome = g.Sum(s => s.OutcomePoints),
                Goalscorer = g.Sum(s => s.GoalscorerPoints)
            })
            .ToDictionaryAsync(g => g.UserId, ct);

        return memberIds
            .Where(id => users.ContainsKey(id))
            .Select(id =>
            {
                var u = users[id];
                scores.TryGetValue(id, out var s);
                return new { UserId = id, u.FirstName, u.LastName, s?.Total, s?.Exact, s?.Outcome, s?.Goalscorer };
            })
            .OrderByDescending(e => e.Total ?? 0)
            .Select((e, i) => new LeaderboardEntryDto(
                e.UserId, e.FirstName, e.LastName,
                e.Total ?? 0, e.Exact ?? 0, e.Outcome ?? 0, e.Goalscorer ?? 0, i + 1))
            .ToList();
    }
}
