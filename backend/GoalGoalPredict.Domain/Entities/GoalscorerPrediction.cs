namespace GoalGoalPredict.Domain.Entities;

public class GoalscorerPrediction
{
    public int Id { get; private set; }
    public Guid PredictionId { get; private set; }
    public int PlayerId { get; private set; }

    public Prediction Prediction { get; private set; } = null!;
    public Player Player { get; private set; } = null!;

    private GoalscorerPrediction() { }

    public static GoalscorerPrediction Create(Guid predictionId, int playerId) => new()
    {
        PredictionId = predictionId,
        PlayerId = playerId
    };
}
