using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Domain.Services;

public static class ScoringEngine
{
    public static (int ExactScore, int Outcome, int Goalscorer) Calculate(
        int predHome, int predAway,
        int matchHome, int matchAway,
        IEnumerable<int> goalscorerPlayerIds,
        IEnumerable<MatchGoal> goals,
        IEnumerable<Player> players)
    {
        int exactScore = 0, outcome = 0, goalscorer = 0;

        if (predHome == matchHome && predAway == matchAway)
            exactScore = 7;
        else if (Math.Sign(predHome - predAway) == Math.Sign(matchHome - matchAway))
            outcome = 2;

        var playerMap = players.ToDictionary(p => p.Id);

        // Count predicted goals per player (same player can appear multiple times)
        var predictedCounts = goalscorerPlayerIds
            .GroupBy(id => id)
            .ToDictionary(g => g.Key, g => g.Count());

        // Count actual scored goals per player (Normal Goal + Penalty only)
        var actualCounts = goals
            .Where(g => g.CountsForScorer && g.ScorerPlayerId.HasValue)
            .GroupBy(g => g.ScorerPlayerId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        foreach (var (playerId, predictedCount) in predictedCounts)
        {
            if (!actualCounts.TryGetValue(playerId, out var actualCount)) continue;
            if (!playerMap.TryGetValue(playerId, out var player)) continue;

            var matchedGoals = Math.Min(predictedCount, actualCount);
            goalscorer += matchedGoals * player.Position switch
            {
                PlayerPosition.Goalkeeper => 4,
                PlayerPosition.Defender => 4,
                PlayerPosition.Midfielder => 2,
                PlayerPosition.Attacker => 1,
                _ => 0
            };
        }

        return (exactScore, outcome, goalscorer);
    }
}
