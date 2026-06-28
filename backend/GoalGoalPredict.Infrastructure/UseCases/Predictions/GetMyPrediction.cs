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
            .AsSplitQuery()
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
            prediction.UpdatedAt,
            prediction.FinishType);
    }

    // The user's prediction for this match in another group, to offer for copying when they
    // haven't predicted in the current group. Picks the group they predicted in FIRST (earliest
    // CreatedAt), so with 3+ groups it always reflects the original.
    public async Task<CopyablePredictionDto?> GetCopyableAsync(Guid userId, int matchId, Guid currentGroupId, CancellationToken ct = default)
    {
        var source = await db.Predictions
            .Include(p => p.GoalscorerPredictions)
            .Include(p => p.CardPredictions)
            .Include(p => p.Group)
            .AsSplitQuery()
            .Where(p => p.UserId == userId && p.MatchId == matchId && p.GroupId != currentGroupId)
            .OrderBy(p => p.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (source is null) return null;

        return new CopyablePredictionDto(
            source.GroupId,
            source.Group.Name,
            source.HomeGoals,
            source.AwayGoals,
            source.GoalscorerPredictions.Select(g => new ScorerPickInput(g.PlayerId, g.GoalType)).ToList(),
            source.CardPredictions.Select(c => new CardPickInput(c.PlayerId, c.Kind.ToString())).ToList());
    }
}
