namespace GoalGoalPredict.Domain.Entities;

// A yellow/red/missed-penalty pick on a guest prediction. PlayerId stored without a hard FK.
public class GuestCardPrediction
{
    public int Id { get; private set; }
    public Guid GuestPredictionId { get; private set; }
    public int PlayerId { get; private set; }
    public CardKind Kind { get; private set; }

    private GuestCardPrediction() { }

    public static GuestCardPrediction Create(Guid guestPredictionId, int playerId, CardKind kind) => new()
    {
        GuestPredictionId = guestPredictionId,
        PlayerId = playerId,
        Kind = kind
    };
}
