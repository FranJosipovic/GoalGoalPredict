using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetMyPredictions(AppDbContext db)
{
    public async Task<List<MyPredictionItemDto>> ExecuteAsync(Guid userId, Guid groupId, bool onlyStarted = false, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var predictions = await db.Predictions
            .Include(p => p.Match).ThenInclude(m => m.HomeTeam)
            .Include(p => p.Match).ThenInclude(m => m.AwayTeam)
            .Include(p => p.Match).ThenInclude(m => m.Goals)
            .Include(p => p.GoalscorerPredictions).ThenInclude(g => g.Player)
            .Include(p => p.Score)
            .Where(p => p.UserId == userId && p.GroupId == groupId)
            // When viewing another member, hide picks for matches that haven't kicked off.
            .Where(p => !onlyStarted || p.Match.KickoffUtc <= now)
            .ToListAsync(ct);

        return predictions
            .OrderBy(p => p.Match.KickoffUtc)
            .Select(p =>
            {
                var m = p.Match;
                var picks = p.GoalscorerPredictions.ToList();
                var awarded = ScoringEngine.AwardScorerPoints(
                    picks.Select(g => (g.PlayerId, g.Player.Position)), m.Goals);
                var scorers = picks
                    .Select((g, idx) => new ScorerPickDto(g.PlayerId, g.Player.Name, g.Player.Position.ToString(), awarded[idx]))
                    .ToList();

                int? finalPoints = p.Score?.TotalPoints;
                int projected = 0;

                if (finalPoints.HasValue)
                {
                    projected = finalPoints.Value;
                }
                else if (m.HomeGoals.HasValue && m.AwayGoals.HasValue)
                {
                    var players = p.GoalscorerPredictions.Select(g => g.Player);
                    var (exact, outcome, goalscorer) = ScoringEngine.Calculate(
                        p.HomeGoals, p.AwayGoals,
                        m.HomeGoals.Value, m.AwayGoals.Value,
                        p.GoalscorerPredictions.Select(g => g.PlayerId),
                        m.Goals, players);
                    projected = exact + outcome + goalscorer;
                }

                return new MyPredictionItemDto(
                    m.Id, m.Round, m.KickoffUtc, m.Status,
                    new TeamSummaryDto(m.HomeTeam.Id, m.HomeTeam.Name, m.HomeTeam.Code, m.HomeTeam.LogoUrl),
                    new TeamSummaryDto(m.AwayTeam.Id, m.AwayTeam.Name, m.AwayTeam.Code, m.AwayTeam.LogoUrl),
                    m.HomeGoals, m.AwayGoals,
                    p.HomeGoals, p.AwayGoals,
                    scorers,
                    finalPoints,
                    projected,
                    finalPoints.HasValue);
            })
            .ToList();
    }
}
