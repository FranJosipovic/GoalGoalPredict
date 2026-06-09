using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class FinalizeMatch(AppDbContext db, EffectiveRulesService effectiveRules, ILogger<FinalizeMatch> logger)
{
    public async Task ExecuteAsync(int matchId, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([matchId], ct);
        if (match is null || match.IsFinished || !match.HomeGoals.HasValue) return;

        var goals = await db.MatchGoals.Where(g => g.MatchId == matchId).ToListAsync(ct);
        var cards = await db.MatchCards.Where(c => c.MatchId == matchId).ToListAsync(ct);

        var predictions = await db.Predictions
            .Include(p => p.GoalscorerPredictions).ThenInclude(g => g.Player)
            .Include(p => p.CardPredictions)
            .Where(p => p.MatchId == matchId && !p.IsScored)
            .ToListAsync(ct);

        // Each prediction belongs to a group; scoring rules are per-group and frozen at kickoff.
        var groupIds = predictions.Select(p => p.GroupId).Distinct().ToList();
        var rulesByGroup = new Dictionary<Guid, GroupScoringRules>();
        foreach (var gid in groupIds)
            rulesByGroup[gid] = await effectiveRules.GetForMatchAsync(gid, match, createIfMissing: true, ct);

        foreach (var prediction in predictions)
        {
            var rules = rulesByGroup[prediction.GroupId];

            var breakdown = ScoringEngine.Calculate(
                rules,
                prediction.HomeGoals, prediction.AwayGoals,
                match.HomeGoals!.Value, match.AwayGoals!.Value,
                prediction.GoalscorerPredictions.Select(g => (g.PlayerId, g.GoalType, g.Player.Position)),
                prediction.CardPredictions.Select(c => (c.PlayerId, c.Kind)),
                goals, cards);

            var existing = await db.PredictionScores.FirstOrDefaultAsync(s => s.PredictionId == prediction.Id, ct);
            if (existing is null)
                db.PredictionScores.Add(PredictionScore.Create(prediction.Id, prediction.UserId, prediction.MatchId, prediction.GroupId, breakdown));
            else
                existing.Recalculate(breakdown);

            prediction.MarkScored();
        }

        match.SetFinished();
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Finalized match {MatchId}: {Count} predictions scored", matchId, predictions.Count);
    }
}
