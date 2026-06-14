namespace GoalGoalPredict.Domain.Entities;

/// <summary>
/// A row in the tournament top-scorers chart, mirrored from API-Football's
/// /players/topscorers endpoint. Denormalised (no FK to Player/Team) because the
/// topscorers feed can reference team/player ids we don't otherwise store.
/// Rebuilt on startup and after each match finishes.
/// </summary>
public class TopScorer
{
    public int PlayerId { get; private set; }
    public string Name { get; private set; } = "";
    public string PhotoUrl { get; private set; } = "";
    public string Nationality { get; private set; } = "";
    public int TeamId { get; private set; }
    public string TeamName { get; private set; } = "";
    public string TeamLogo { get; private set; } = "";
    public int Goals { get; private set; }
    public int Assists { get; private set; }
    public int Appearances { get; private set; }
    public int Minutes { get; private set; }
    public int PenaltiesScored { get; private set; }
    public int Rank { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private TopScorer() { }

    public static TopScorer Create(int playerId, string name, string photoUrl, string nationality,
        int teamId, string teamName, string teamLogo,
        int goals, int assists, int appearances, int minutes, int penaltiesScored, int rank) => new()
    {
        PlayerId = playerId,
        Name = name,
        PhotoUrl = photoUrl,
        Nationality = nationality,
        TeamId = teamId,
        TeamName = teamName,
        TeamLogo = teamLogo,
        Goals = goals,
        Assists = assists,
        Appearances = appearances,
        Minutes = minutes,
        PenaltiesScored = penaltiesScored,
        Rank = rank,
        UpdatedAt = DateTime.UtcNow
    };
}
