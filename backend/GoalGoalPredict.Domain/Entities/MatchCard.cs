namespace GoalGoalPredict.Domain.Entities;

/// <summary>
/// An actual card event in a match (yellow or red), mirrored from the live feed
/// or produced by the match simulation. Parallels <see cref="MatchGoal"/>.
/// </summary>
public class MatchCard
{
    public int Id { get; private set; }
    public int MatchId { get; private set; }
    public int? PlayerId { get; private set; }
    public int TeamId { get; private set; }
    public int Minute { get; private set; }
    public int? ExtraMinute { get; private set; }
    public string CardType { get; private set; } = "";
    public int ApiEventOrder { get; private set; }

    public Match Match { get; private set; } = null!;
    public Player? Player { get; private set; }

    private MatchCard() { }

    public static MatchCard Create(int matchId, int? playerId, int teamId, int minute, int? extraMinute, string cardType, int apiEventOrder) => new()
    {
        MatchId = matchId,
        PlayerId = playerId,
        TeamId = teamId,
        Minute = minute,
        ExtraMinute = extraMinute,
        CardType = cardType,
        ApiEventOrder = apiEventOrder
    };

    public bool IsYellow => CardType == "Yellow Card";
    public bool IsRed => CardType == "Red Card";
}
