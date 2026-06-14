namespace GoalGoalPredict.Domain.Entities;

/// <summary>
/// A single row in the tournament group standings, mirrored from API-Football's
/// /standings endpoint. One row per team. Refreshed on startup and after each match finishes.
/// </summary>
public class Standing
{
    public int Id { get; private set; }
    public int TeamId { get; private set; }
    public string GroupName { get; private set; } = "";   // e.g. "Group A"
    public int Rank { get; private set; }
    public int Points { get; private set; }
    public int GoalsDiff { get; private set; }
    public int Played { get; private set; }
    public int Win { get; private set; }
    public int Draw { get; private set; }
    public int Lose { get; private set; }
    public int GoalsFor { get; private set; }
    public int GoalsAgainst { get; private set; }
    public string Form { get; private set; } = "";        // e.g. "WDL"
    public string Description { get; private set; } = "";  // e.g. "Round of 32"
    public DateTime UpdatedAt { get; private set; }

    public Team Team { get; private set; } = null!;

    private Standing() { }

    public static Standing Create(int teamId) => new() { TeamId = teamId };

    public void Update(string groupName, int rank, int points, int goalsDiff,
        int played, int win, int draw, int lose, int goalsFor, int goalsAgainst,
        string form, string description)
    {
        GroupName = groupName;
        Rank = rank;
        Points = points;
        GoalsDiff = goalsDiff;
        Played = played;
        Win = win;
        Draw = draw;
        Lose = lose;
        GoalsFor = goalsFor;
        GoalsAgainst = goalsAgainst;
        Form = form ?? "";
        Description = description ?? "";
        UpdatedAt = DateTime.UtcNow;
    }
}
