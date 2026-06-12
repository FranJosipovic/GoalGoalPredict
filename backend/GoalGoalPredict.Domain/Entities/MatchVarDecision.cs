namespace GoalGoalPredict.Domain.Entities;

/// <summary>
/// A VAR (video assistant referee) decision in a match, mirrored from the live feed —
/// e.g. "Goal Disallowed - offside", "Penalty confirmed", "Goal cancelled". Parallels
/// <see cref="MatchGoal"/> / <see cref="MatchCard"/>. API-Football reports these as
/// <c>type: "Var"</c> events; the meaning is carried by <see cref="Detail"/>.
/// </summary>
public class MatchVarDecision
{
    public int Id { get; private set; }
    public int MatchId { get; private set; }
    public int TeamId { get; private set; }
    public int? PlayerId { get; private set; }
    public int Minute { get; private set; }
    public int? ExtraMinute { get; private set; }
    public string Detail { get; private set; } = "";
    public int ApiEventOrder { get; private set; }

    public Match Match { get; private set; } = null!;
    public Player? Player { get; private set; }

    private MatchVarDecision() { }

    public static MatchVarDecision Create(int matchId, int teamId, int? playerId, int minute, int? extraMinute, string detail, int apiEventOrder) => new()
    {
        MatchId = matchId,
        TeamId = teamId,
        PlayerId = playerId,
        Minute = minute,
        ExtraMinute = extraMinute,
        Detail = detail,
        ApiEventOrder = apiEventOrder
    };
}
