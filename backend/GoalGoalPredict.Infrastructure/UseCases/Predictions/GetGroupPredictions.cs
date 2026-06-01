using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetGroupPredictions(AppDbContext db)
{
    public async Task<GroupPredictionsDto?> ExecuteAsync(int matchId, Guid groupId, CancellationToken ct = default)
    {
        var match = await db.Matches.Include(m => m.Goals).FirstOrDefaultAsync(m => m.Id == matchId, ct);
        if (match is null) return null;
        if (match.KickoffUtc > DateTime.UtcNow) return null;

        var predictions = await db.Predictions
            .Include(p => p.User)
            .Include(p => p.GoalscorerPredictions).ThenInclude(g => g.Player)
            .Include(p => p.Score)
            .Where(p => p.MatchId == matchId && p.GroupId == groupId)
            .ToListAsync(ct);

        var goals = match.Goals.ToList();
        var allPlayers = predictions
            .SelectMany(p => p.GoalscorerPredictions.Select(g => g.Player))
            .DistinctBy(p => p.Id).ToList();

        var members = predictions.Select(p =>
        {
            int projected;
            if (p.Score is not null)
            {
                projected = p.Score.TotalPoints;
            }
            else if (match.HomeGoals.HasValue && match.AwayGoals.HasValue)
            {
                var (exact, outcome, goalscorer) = ScoringEngine.Calculate(
                    p.HomeGoals, p.AwayGoals,
                    match.HomeGoals.Value, match.AwayGoals.Value,
                    p.GoalscorerPredictions.Select(g => g.PlayerId),
                    goals, allPlayers);
                projected = exact + outcome + goalscorer;
            }
            else
            {
                projected = 0;
            }

            return new MemberPredictionDto(
                p.UserId, p.User.FirstName, p.User.LastName,
                p.HomeGoals, p.AwayGoals,
                p.GoalscorerPredictions.Select(g => new ScorerPickDto(g.PlayerId, g.Player.Name, g.Player.Position.ToString())).ToList(),
                projected);
        }).OrderByDescending(m => m.ProjectedPoints).ToList();

        return new GroupPredictionsDto(matchId, match.Status, match.HomeGoals, match.AwayGoals, members);
    }
}
