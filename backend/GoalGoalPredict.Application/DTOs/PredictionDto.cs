namespace GoalGoalPredict.Application.DTOs;

public record ScorerPickInput(int PlayerId, string GoalType);
public record CardPickInput(int PlayerId, string Kind);

public record UpsertPredictionRequest(
    int MatchId,
    Guid GroupId,
    int HomeGoals,
    int AwayGoals,
    List<ScorerPickInput> Scorers,
    List<CardPickInput> Cards,
    // Knockout-only: "Regular" | "ExtraTime" | "Penalties". Null for group-stage matches.
    string? FinishType = null);

public record PredictionResultDto(
    Guid Id,
    int MatchId,
    Guid GroupId,
    int HomeGoals,
    int AwayGoals,
    List<ScorerPickInput> Scorers,
    List<CardPickInput> Cards,
    DateTime UpdatedAt,
    string? FinishType = null);

// A prediction the user already made for this match in another group — offered for copying.
// Source is the group where they predicted earliest (by CreatedAt).
public record CopyablePredictionDto(
    Guid SourceGroupId,
    string SourceGroupName,
    int HomeGoals,
    int AwayGoals,
    List<ScorerPickInput> Scorers,
    List<CardPickInput> Cards);

public record LeaderboardEntryDto(
    Guid UserId,
    string FirstName,
    string LastName,
    int TotalPoints,
    int ExactScores,
    int CorrectOutcomes,
    int GoalscorerPoints,
    int Position);
