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
    public int TotalPoints { get; private set; }
    public DateTime CalculatedAt { get; private set; }

    public Prediction Prediction { get; private set; } = null!;

    private PredictionScore() { }

    public static PredictionScore Create(Guid predictionId, Guid userId, int matchId, Guid groupId,
        int exactScore, int outcome, int goalscorer) => new()
    {
        PredictionId = predictionId,
        UserId = userId,
        MatchId = matchId,
        GroupId = groupId,
        ExactScorePoints = exactScore,
        OutcomePoints = outcome,
        GoalscorerPoints = goalscorer,
        TotalPoints = exactScore + outcome + goalscorer,
        CalculatedAt = DateTime.UtcNow
    };

    public void Recalculate(int exactScore, int outcome, int goalscorer)
    {
        ExactScorePoints = exactScore;
        OutcomePoints = outcome;
        GoalscorerPoints = goalscorer;
        TotalPoints = exactScore + outcome + goalscorer;
        CalculatedAt = DateTime.UtcNow;
    }
}
