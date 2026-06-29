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
    List<CardPickInput> Cards,
    string? FinishType = null);

// One of the user's other groups this prediction can be copied into.
public record CopyTargetDto(Guid GroupId, string GroupName, bool AlreadyPredicted);

// Copy the user's prediction for a match from one group into a set of their other groups.
public record CopyToGroupsRequest(int MatchId, Guid SourceGroupId, List<Guid> TargetGroupIds);

public record CopyToGroupsResultDto(int Copied, int Failed);

public record LeaderboardEntryDto(
    Guid UserId,
    string FirstName,
    string LastName,
    int TotalPoints,
    int ExactScores,
    int CorrectOutcomes,
    int GoalscorerPoints,
    int Position);
