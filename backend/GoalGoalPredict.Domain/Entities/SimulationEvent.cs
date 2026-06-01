namespace GoalGoalPredict.Domain.Entities;

public class SimulationEvent
{
    public int Id { get; private set; }
    public int MatchId { get; private set; }
    public int PlayerId { get; private set; }
    public int TeamId { get; private set; }
    public int Minute { get; private set; }
    public string GoalType { get; private set; } = "Normal Goal";
    public bool IsProcessed { get; private set; }
    public DateTime? ProcessedAt { get; private set; }

    public Match Match { get; private set; } = null!;
    public Player Player { get; private set; } = null!;

    private SimulationEvent() { }

    public static SimulationEvent Create(int matchId, int playerId, int teamId, int minute, string goalType) => new()
    {
        MatchId = matchId,
        PlayerId = playerId,
        TeamId = teamId,
        Minute = minute,
        GoalType = goalType,
        IsProcessed = false
    };

    public void MarkProcessed()
    {
        IsProcessed = true;
        ProcessedAt = DateTime.UtcNow;
    }
}
