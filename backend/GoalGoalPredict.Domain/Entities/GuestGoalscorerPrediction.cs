namespace GoalGoalPredict.Domain.Entities;

// A goalscorer pick on a guest prediction. PlayerId is stored without a hard FK so an
// incomplete API squad can't crash the insert (see missing-player FK notes).
public class GuestGoalscorerPrediction
{
    public int Id { get; private set; }
    public Guid GuestPredictionId { get; private set; }
    public int PlayerId { get; private set; }
    public string GoalType { get; private set; } = "Normal Goal";

    private GuestGoalscorerPrediction() { }

    public static GuestGoalscorerPrediction Create(Guid guestPredictionId, int playerId, string goalType = "Normal Goal") => new()
    {
        GuestPredictionId = guestPredictionId,
        PlayerId = playerId,
        GoalType = goalType
    };
}
