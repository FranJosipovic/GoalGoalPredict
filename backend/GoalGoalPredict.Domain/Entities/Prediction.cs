namespace GoalGoalPredict.Domain.Entities;

public class Prediction
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public int MatchId { get; private set; }
    public Guid GroupId { get; private set; }
    public int HomeGoals { get; private set; }
    public int AwayGoals { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public bool IsScored { get; private set; }

    public User User { get; private set; } = null!;
    public Match Match { get; private set; } = null!;
    public Group Group { get; private set; } = null!;
    public ICollection<GoalscorerPrediction> GoalscorerPredictions { get; private set; } = [];
    public ICollection<CardPrediction> CardPredictions { get; private set; } = [];
    public PredictionScore? Score { get; private set; }

    private Prediction() { }

    public static Prediction Create(Guid userId, int matchId, Guid groupId, int homeGoals, int awayGoals) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        MatchId = matchId,
        GroupId = groupId,
        HomeGoals = homeGoals,
        AwayGoals = awayGoals,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        IsScored = false
    };

    public void Update(int homeGoals, int awayGoals)
    {
        HomeGoals = homeGoals;
        AwayGoals = awayGoals;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkScored() => IsScored = true;
}
