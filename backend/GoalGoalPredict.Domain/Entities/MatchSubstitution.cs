namespace GoalGoalPredict.Domain.Entities;

/// <summary>
/// A substitution event in a match, mirrored from the live feed. Parallels
/// <see cref="MatchGoal"/> and <see cref="MatchCard"/>. API-Football reports the
/// player coming ON in the event's <c>player</c> field and the player going OFF in
/// the <c>assist</c> field.
/// </summary>
public class MatchSubstitution
{
    public int Id { get; private set; }
    public int MatchId { get; private set; }
    public int TeamId { get; private set; }
    public int Minute { get; private set; }
    public int? ExtraMinute { get; private set; }
    public int? PlayerInId { get; private set; }
    public int? PlayerOutId { get; private set; }
    public int ApiEventOrder { get; private set; }

    public Match Match { get; private set; } = null!;
    public Player? PlayerIn { get; private set; }
    public Player? PlayerOut { get; private set; }

    private MatchSubstitution() { }

    public static MatchSubstitution Create(int matchId, int teamId, int minute, int? extraMinute, int? playerInId, int? playerOutId, int apiEventOrder) => new()
    {
        MatchId = matchId,
        TeamId = teamId,
        Minute = minute,
        ExtraMinute = extraMinute,
        PlayerInId = playerInId,
        PlayerOutId = playerOutId,
        ApiEventOrder = apiEventOrder
    };
}
