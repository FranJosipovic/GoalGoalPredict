using GoalGoalPredict.Domain.Services;

namespace GoalGoalPredict.Domain.Entities;

public class PredictionScore
{
    public int Id { get; private set; }
    public Guid PredictionId { get; private set; }
    public Guid UserId { get; private set; }
    public int MatchId { get; private set; }
    public Guid GroupId { get; private set; }
    public int ExactScorePoints { get; private set; }
    public int OutcomePoints { get; private set; }
    public int GoalscorerPoints { get; private set; }
    public int OwnGoalPoints { get; private set; }
    public int YellowCardPoints { get; private set; }
    public int RedCardPoints { get; private set; }
    public int MissedPenaltyPoints { get; private set; }
    public int TotalPoints { get; private set; }
    public DateTime CalculatedAt { get; private set; }

    public Prediction Prediction { get; private set; } = null!;

    private PredictionScore() { }

    public static PredictionScore Create(Guid predictionId, Guid userId, int matchId, Guid groupId,
        ScoreBreakdown b) => new()
    {
        PredictionId = predictionId,
        UserId = userId,
        MatchId = matchId,
        GroupId = groupId,
        ExactScorePoints = b.Exact,
        OutcomePoints = b.Outcome,
        GoalscorerPoints = b.Goalscorer,
        OwnGoalPoints = b.OwnGoal,
        YellowCardPoints = b.Yellow,
        RedCardPoints = b.Red,
        MissedPenaltyPoints = b.MissedPenalty,
        TotalPoints = b.Total,
        CalculatedAt = DateTime.UtcNow
    };

    public void Recalculate(ScoreBreakdown b)
    {
        ExactScorePoints = b.Exact;
        OutcomePoints = b.Outcome;
        GoalscorerPoints = b.Goalscorer;
        OwnGoalPoints = b.OwnGoal;
        YellowCardPoints = b.Yellow;
        RedCardPoints = b.Red;
        MissedPenaltyPoints = b.MissedPenalty;
        TotalPoints = b.Total;
        CalculatedAt = DateTime.UtcNow;
    }
}
