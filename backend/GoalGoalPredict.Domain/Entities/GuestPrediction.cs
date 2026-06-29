namespace GoalGoalPredict.Domain.Entities;

/// <summary>
/// A prediction made by an un-registered visitor from the landing page, identified only by the
/// email they want their result sent to. Scored with the default rules when the match finishes.
/// </summary>
public class GuestPrediction
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = default!;
    public int MatchId { get; private set; }
    public int HomeGoals { get; private set; }
    public int AwayGoals { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public bool IsScored { get; private set; }
    public int TotalPoints { get; private set; }
    public DateTime? ScoredAt { get; private set; }
    public bool Notified { get; private set; }

    public ICollection<GuestGoalscorerPrediction> Scorers { get; private set; } = [];
    public ICollection<GuestCardPrediction> Cards { get; private set; } = [];

    private GuestPrediction() { }

    public static GuestPrediction Create(string email, int matchId, int homeGoals, int awayGoals) => new()
    {
        Id = Guid.NewGuid(),
        Email = email.Trim().ToLowerInvariant(),
        MatchId = matchId,
        HomeGoals = homeGoals,
        AwayGoals = awayGoals,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    public void Update(int homeGoals, int awayGoals)
    {
        HomeGoals = homeGoals;
        AwayGoals = awayGoals;
        UpdatedAt = DateTime.UtcNow;
        // Editing resets scoring state — it will be rescored at finalize.
        IsScored = false;
        TotalPoints = 0;
        ScoredAt = null;
        Notified = false;
    }

    public void MarkScored(int totalPoints)
    {
        IsScored = true;
        TotalPoints = totalPoints;
        ScoredAt = DateTime.UtcNow;
    }

    public void MarkNotified() => Notified = true;
}
