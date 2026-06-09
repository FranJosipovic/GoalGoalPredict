using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Domain.Services;

/// <summary>
/// Full per-category point breakdown for a single prediction.
/// Card categories can be negative under <see cref="CardPredictionMode.Net"/>.
/// </summary>
public record ScoreBreakdown(
    int Exact, int Outcome, int Goalscorer, int OwnGoal,
    int Yellow, int Red, int MissedPenalty)
{
    public int Total => Exact + Outcome + Goalscorer + OwnGoal + Yellow + Red + MissedPenalty;

    public static readonly ScoreBreakdown Zero = new(0, 0, 0, 0, 0, 0, 0);
}

public static class ScoringEngine
{
    public static ScoreBreakdown Calculate(
        GroupScoringRules rules,
        int predHome, int predAway,
        int matchHome, int matchAway,
        IEnumerable<(int PlayerId, string GoalType, PlayerPosition Position)> scorerPicks,
        IEnumerable<(int PlayerId, CardKind Kind)> cardPicks,
        IEnumerable<MatchGoal> goals,
        IEnumerable<MatchCard> cards)
    {
        var goalsList = goals as ICollection<MatchGoal> ?? goals.ToList();
        var cardsList = cards as ICollection<MatchCard> ?? cards.ToList();

        int exact = 0, outcome = 0;
        if (rules.ExactScoreEnabled && predHome == matchHome && predAway == matchAway)
            exact = rules.ExactScorePoints;
        else if (rules.OutcomeEnabled && Math.Sign(predHome - predAway) == Math.Sign(matchHome - matchAway))
            outcome = rules.OutcomePoints;

        var picks = scorerPicks.ToList();
        var scorerAwards = AwardScorerPoints(rules, picks, goalsList);
        int goalscorer = 0, ownGoal = 0;
        for (int i = 0; i < picks.Count; i++)
        {
            if (picks[i].GoalType == "Own Goal") ownGoal += scorerAwards[i];
            else goalscorer += scorerAwards[i];
        }

        var cList = cardPicks.ToList();
        var cardAwards = AwardCardPoints(rules, cList, goalsList, cardsList);
        int yellow = 0, red = 0, missed = 0;
        for (int i = 0; i < cList.Count; i++)
        {
            switch (cList[i].Kind)
            {
                case CardKind.Yellow: yellow += cardAwards[i]; break;
                case CardKind.Red: red += cardAwards[i]; break;
                case CardKind.MissedPenalty: missed += cardAwards[i]; break;
            }
        }

        return new ScoreBreakdown(exact, outcome, goalscorer, ownGoal, yellow, red, missed);
    }

    /// <summary>
    /// Per-pick points for goalscorer picks. A pick scores only when the same player has an
    /// actual goal of the *same predicted type* not yet consumed by an earlier pick. Own Goal
    /// picks pay the flat own-goal value (position ignored); Normal/Penalty pay by position.
    /// </summary>
    public static List<int> AwardScorerPoints(
        GroupScoringRules rules,
        IEnumerable<(int PlayerId, string GoalType, PlayerPosition Position)> picks,
        IEnumerable<MatchGoal> goals)
    {
        var remaining = goals
            .Where(g => g.ScorerPlayerId.HasValue && g.GoalType is "Normal Goal" or "Penalty" or "Own Goal")
            .GroupBy(g => (g.ScorerPlayerId!.Value, g.GoalType))
            .ToDictionary(g => g.Key, g => g.Count());

        var result = new List<int>();
        foreach (var (playerId, goalType, position) in picks)
        {
            var key = (playerId, goalType);
            if (remaining.TryGetValue(key, out var left) && left > 0)
            {
                int pts = goalType == "Own Goal"
                    ? (rules.OwnGoalEnabled ? rules.OwnGoalPoints : 0)
                    : (rules.GoalscorerEnabled ? rules.ScorerPointsFor(position) : 0);
                result.Add(pts);
                remaining[key] = left - 1;
            }
            else
            {
                result.Add(0);
            }
        }
        return result;
    }

    /// <summary>
    /// Per-pick points for card-style picks (yellow / red / missed penalty). A correct pick pays
    /// the configured flat points; in Net mode a wrong pick subtracts WrongPickPenalty.
    /// Missed penalties are read from <see cref="MatchGoal"/> rows of type "Missed Penalty".
    /// </summary>
    public static List<int> AwardCardPoints(
        GroupScoringRules rules,
        IEnumerable<(int PlayerId, CardKind Kind)> picks,
        IEnumerable<MatchGoal> goals,
        IEnumerable<MatchCard> cards)
    {
        var yellow = cards.Where(c => c.IsYellow && c.PlayerId.HasValue).Select(c => c.PlayerId!.Value).ToHashSet();
        var red = cards.Where(c => c.IsRed && c.PlayerId.HasValue).Select(c => c.PlayerId!.Value).ToHashSet();
        var missed = goals.Where(g => g.GoalType == "Missed Penalty" && g.ScorerPlayerId.HasValue)
            .Select(g => g.ScorerPlayerId!.Value).ToHashSet();

        HashSet<int> ActualFor(CardKind k) => k switch
        {
            CardKind.Yellow => yellow,
            CardKind.Red => red,
            _ => missed
        };

        var result = new List<int>();
        foreach (var (playerId, kind) in picks)
        {
            if (!rules.EnabledFor(kind)) { result.Add(0); continue; }

            if (ActualFor(kind).Contains(playerId))
                result.Add(rules.PointsFor(kind));
            else
                result.Add(rules.CardPredictionMode == CardPredictionMode.Net ? -rules.WrongPickPenalty : 0);
        }
        return result;
    }
}
