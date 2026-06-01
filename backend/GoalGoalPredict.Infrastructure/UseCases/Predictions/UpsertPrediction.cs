using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class UpsertPrediction(AppDbContext db)
{
    public async Task<(PredictionResultDto? Result, string? Error)> ExecuteAsync(
        Guid userId, UpsertPredictionRequest request, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([request.MatchId], ct);
        if (match is null) return (null, "Match not found");
        if (match.KickoffUtc <= DateTime.UtcNow) return (null, "Predictions are locked — match has started");

        var isMember = await db.GroupMembers.AnyAsync(m => m.GroupId == request.GroupId && m.UserId == userId, ct);
        if (!isMember) return (null, "Not a member of this group");

        var existing = await db.Predictions
            .FirstOrDefaultAsync(p => p.UserId == userId && p.MatchId == request.MatchId && p.GroupId == request.GroupId, ct);

        Guid predictionId;
        if (existing is null)
        {
            var prediction = Prediction.Create(userId, request.MatchId, request.GroupId, request.HomeGoals, request.AwayGoals);
            db.Predictions.Add(prediction);
            predictionId = prediction.Id;
        }
        else
        {
            existing.Update(request.HomeGoals, request.AwayGoals);
            predictionId = existing.Id;
            var oldScorers = await db.GoalscorerPredictions.Where(g => g.PredictionId == predictionId).ToListAsync(ct);
            db.GoalscorerPredictions.RemoveRange(oldScorers);
        }

        // Allow duplicate player IDs (same player can score multiple goals)
        var scorerIds = request.GoalscorerPlayerIds.ToList();
        db.GoalscorerPredictions.AddRange(scorerIds.Select(pid => GoalscorerPrediction.Create(predictionId, pid)));

        await db.SaveChangesAsync(ct);

        return (new PredictionResultDto(predictionId, request.MatchId, request.GroupId,
            request.HomeGoals, request.AwayGoals, scorerIds, DateTime.UtcNow), null);
    }
}
