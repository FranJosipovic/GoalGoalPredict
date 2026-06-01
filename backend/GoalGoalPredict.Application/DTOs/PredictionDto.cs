namespace GoalGoalPredict.Application.DTOs;

public record UpsertPredictionRequest(
    int MatchId,
    Guid GroupId,
    int HomeGoals,
    int AwayGoals,
    List<int> GoalscorerPlayerIds);

public record PredictionResultDto(
    Guid Id,
    int MatchId,
    Guid GroupId,
    int HomeGoals,
    int AwayGoals,
    List<int> GoalscorerPlayerIds,
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
