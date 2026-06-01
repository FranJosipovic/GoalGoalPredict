namespace GoalGoalPredict.Domain.Entities;

public class MatchGoal
{
    public int Id { get; private set; }
    public int MatchId { get; private set; }
    public int? ScorerPlayerId { get; private set; }
    public int TeamId { get; private set; }
    public int Minute { get; private set; }
    public int? ExtraMinute { get; private set; }
    public string GoalType { get; private set; } = "";
    public int ApiEventOrder { get; private set; }

    public Match Match { get; private set; } = null!;
    public Player? Scorer { get; private set; }

    private MatchGoal() { }

    public static MatchGoal Create(int matchId, int? scorerPlayerId, int teamId, int minute, int? extraMinute, string goalType, int apiEventOrder) => new()
    {
        MatchId = matchId,
        ScorerPlayerId = scorerPlayerId,
        TeamId = teamId,
        Minute = minute,
        ExtraMinute = extraMinute,
        GoalType = goalType,
        ApiEventOrder = apiEventOrder
    };

    public bool CountsForScorer => GoalType is "Normal Goal" or "Penalty";
}
