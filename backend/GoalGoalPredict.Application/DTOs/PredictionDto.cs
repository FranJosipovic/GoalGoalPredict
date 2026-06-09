namespace GoalGoalPredict.Application.DTOs;

public record ScorerPickInput(int PlayerId, string GoalType);
public record CardPickInput(int PlayerId, string Kind);

public record UpsertPredictionRequest(
    int MatchId,
    Guid GroupId,
    int HomeGoals,
    int AwayGoals,
    List<ScorerPickInput> Scorers,
    List<CardPickInput> Cards);

public record PredictionResultDto(
    Guid Id,
    int MatchId,
    Guid GroupId,
    int HomeGoals,
    int AwayGoals,
    List<ScorerPickInput> Scorers,
    List<CardPickInput> Cards,
    DateTime UpdatedAt);

public record LeaderboardEntryDto(
    Guid UserId,
    string FirstName,
    string LastName,
    int TotalPoints,
    int ExactScores,
    int CorrectOutcomes,
    int GoalscorerPoints,
    int Position);
