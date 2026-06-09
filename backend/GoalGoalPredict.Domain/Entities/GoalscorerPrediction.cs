namespace GoalGoalPredict.Domain.Entities;

public class GoalscorerPrediction
{
    public int Id { get; private set; }
    public Guid PredictionId { get; private set; }
    public int PlayerId { get; private set; }
    // Predicted goal type: "Normal Goal" | "Penalty" | "Own Goal".
    public string GoalType { get; private set; } = "Normal Goal";

    public Prediction Prediction { get; private set; } = null!;
    public Player Player { get; private set; } = null!;

    private GoalscorerPrediction() { }

    public static GoalscorerPrediction Create(Guid predictionId, int playerId, string goalType = "Normal Goal") => new()
    {
        PredictionId = predictionId,
        PlayerId = playerId,
        GoalType = goalType
    };

    public bool IsOwnGoal => GoalType == "Own Goal";
}
