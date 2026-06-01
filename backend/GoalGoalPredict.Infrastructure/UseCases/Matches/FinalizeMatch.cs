using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class FinalizeMatch(AppDbContext db, ILogger<FinalizeMatch> logger)
{
    public async Task ExecuteAsync(int matchId, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([matchId], ct);
        if (match is null || match.IsFinished || !match.HomeGoals.HasValue) return;

        var goals = await db.MatchGoals.Where(g => g.MatchId == matchId).ToListAsync(ct);

        var predictions = await db.Predictions
            .Include(p => p.GoalscorerPredictions)
            .Where(p => p.MatchId == matchId && !p.IsScored)
            .ToListAsync(ct);

        var allPlayerIds = predictions
            .SelectMany(p => p.GoalscorerPredictions.Select(g => g.PlayerId))
            .Concat(goals.Where(g => g.ScorerPlayerId.HasValue).Select(g => g.ScorerPlayerId!.Value))
            .Distinct().ToList();

        var players = allPlayerIds.Count > 0
            ? await db.Players.Where(p => allPlayerIds.Contains(p.Id)).ToListAsync(ct)
            : [];

        foreach (var prediction in predictions)
        {
            var (exact, outcome, goalscorer) = ScoringEngine.Calculate(
                prediction.HomeGoals, prediction.AwayGoals,
                match.HomeGoals!.Value, match.AwayGoals!.Value,
                prediction.GoalscorerPredictions.Select(g => g.PlayerId),
                goals, players);

            var existing = await db.PredictionScores.FirstOrDefaultAsync(s => s.PredictionId == prediction.Id, ct);
            if (existing is null)
                db.PredictionScores.Add(PredictionScore.Create(prediction.Id, prediction.UserId, prediction.MatchId, prediction.GroupId, exact, outcome, goalscorer));
            else
                existing.Recalculate(exact, outcome, goalscorer);

            prediction.MarkScored();
        }

        match.SetFinished();
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Finalized match {MatchId}: {Count} predictions scored", matchId, predictions.Count);
    }
}
