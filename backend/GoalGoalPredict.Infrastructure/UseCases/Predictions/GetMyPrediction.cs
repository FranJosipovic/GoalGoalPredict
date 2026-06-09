using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetMyPrediction(AppDbContext db)
{
    public async Task<PredictionResultDto?> ExecuteAsync(Guid userId, int matchId, Guid groupId, CancellationToken ct = default)
    {
        var prediction = await db.Predictions
            .Include(p => p.GoalscorerPredictions)
            .Include(p => p.CardPredictions)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.MatchId == matchId && p.GroupId == groupId, ct);

        if (prediction is null) return null;

        return new PredictionResultDto(
            prediction.Id,
            prediction.MatchId,
            prediction.GroupId,
            prediction.HomeGoals,
            prediction.AwayGoals,
            prediction.GoalscorerPredictions.Select(g => new ScorerPickInput(g.PlayerId, g.GoalType)).ToList(),
            prediction.CardPredictions.Select(c => new CardPickInput(c.PlayerId, c.Kind.ToString())).ToList(),
            prediction.UpdatedAt);
    }
}
