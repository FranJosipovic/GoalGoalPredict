namespace GoalGoalPredict.Domain.Entities;

public class MatchLineupPlayer
{
    public int Id { get; private set; }
    public int MatchId { get; private set; }
    public int TeamId { get; private set; }
    public int PlayerId { get; private set; }
    public bool IsStarting { get; private set; }
    public string Position { get; private set; } = "";
    public int ShirtNumber { get; private set; }

    public Match Match { get; private set; } = null!;
    public Player Player { get; private set; } = null!;

    private MatchLineupPlayer() { }

    public static MatchLineupPlayer Create(int matchId, int teamId, int playerId, bool isStarting, string position, int shirtNumber) => new()
    {
        MatchId = matchId,
        TeamId = teamId,
        PlayerId = playerId,
        IsStarting = isStarting,
        Position = position,
        ShirtNumber = shirtNumber
    };
}
