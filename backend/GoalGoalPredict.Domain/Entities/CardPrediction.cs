namespace GoalGoalPredict.Domain.Entities;

public enum CardKind { Yellow, Red, MissedPenalty }

/// <summary>
/// A player a user predicts will receive a yellow/red card or miss a penalty in a match.
/// </summary>
public class CardPrediction
{
    public int Id { get; private set; }
    public Guid PredictionId { get; private set; }
    public int PlayerId { get; private set; }
    public CardKind Kind { get; private set; }

    public Prediction Prediction { get; private set; } = null!;
    public Player Player { get; private set; } = null!;

    private CardPrediction() { }

    public static CardPrediction Create(Guid predictionId, int playerId, CardKind kind) => new()
    {
        PredictionId = predictionId,
        PlayerId = playerId,
        Kind = kind
    };
}
