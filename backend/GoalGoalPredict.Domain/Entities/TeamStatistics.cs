namespace GoalGoalPredict.Domain.Entities;

/// <summary>
/// A curated slice of API-Football's /teams/statistics for one team in the tournament.
/// Refreshed lazily when a team page is opened and after that team plays a match.
/// </summary>
public class TeamStatistics
{
    public int TeamId { get; private set; }
    public string Form { get; private set; } = "";
    public int Played { get; private set; }
    public int Wins { get; private set; }
    public int Draws { get; private set; }
    public int Loses { get; private set; }
    public int? GoalsFor { get; private set; }
    public int? GoalsAgainst { get; private set; }
    public int CleanSheets { get; private set; }
    public int FailedToScore { get; private set; }
    public int PenaltyScored { get; private set; }
    public int PenaltyMissed { get; private set; }
    public int YellowCards { get; private set; }
    public int RedCards { get; private set; }
    public string? Formation { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public Team Team { get; private set; } = null!;

    private TeamStatistics() { }

    public static TeamStatistics Create(int teamId) => new() { TeamId = teamId };

    public void Update(string form, int played, int wins, int draws, int loses,
        int? goalsFor, int? goalsAgainst, int cleanSheets, int failedToScore,
        int penaltyScored, int penaltyMissed, int yellowCards, int redCards, string? formation)
    {
        Form = form ?? "";
        Played = played;
        Wins = wins;
        Draws = draws;
        Loses = loses;
        GoalsFor = goalsFor;
        GoalsAgainst = goalsAgainst;
        CleanSheets = cleanSheets;
        FailedToScore = failedToScore;
        PenaltyScored = penaltyScored;
        PenaltyMissed = penaltyMissed;
        YellowCards = yellowCards;
        RedCards = redCards;
        Formation = formation;
        UpdatedAt = DateTime.UtcNow;
    }
}
