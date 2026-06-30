namespace GoalGoalPredict.Domain.Entities;

// A single kick in a penalty shootout. Purely informational — shootout penalties are
// deliberately excluded from scoring (goalscorer picks + judged scoreline are reg+ET only),
// so this is stored separately from MatchGoal and never feeds the ScoringEngine.
public class MatchShootoutPenalty
{
    public int Id { get; private set; }
    public int MatchId { get; private set; }
    public int? PlayerId { get; private set; }
    public int TeamId { get; private set; }
    public bool Scored { get; private set; }
    // Order the kicks were taken in (API feed order), so the sequence renders correctly.
    public int ApiEventOrder { get; private set; }

    public Match Match { get; private set; } = null!;
    public Player? Player { get; private set; }

    private MatchShootoutPenalty() { }

    public static MatchShootoutPenalty Create(int matchId, int? playerId, int teamId, bool scored, int apiEventOrder) => new()
    {
        MatchId = matchId,
        PlayerId = playerId,
        TeamId = teamId,
        Scored = scored,
        ApiEventOrder = apiEventOrder
    };
}
