namespace GoalGoalPredict.Application.DTOs;

public record TeamSummaryDto(int Id, string Name, string Code, string LogoUrl);

public record MatchListItemDto(
    int Id,
    string Round,
    DateTime KickoffUtc,
    string Status,
    int? ElapsedMinutes,
    TeamSummaryDto HomeTeam,
    TeamSummaryDto AwayTeam,
    int? HomeGoals,
    int? AwayGoals,
    MyPredictionDto? MyPrediction);

public record MyPredictionDto(
    Guid Id,
    int HomeGoals,
    int AwayGoals,
    List<int> GoalscorerPlayerIds,
    int? TotalPoints);

public record MatchDetailDto(
    int Id,
    string Round,
    DateTime KickoffUtc,
    string Status,
    int? ElapsedMinutes,
    TeamSummaryDto HomeTeam,
    TeamSummaryDto AwayTeam,
    int? HomeGoals,
    int? AwayGoals,
    List<LineupPlayerDto> Lineup,
    List<GoalEventDto> Goals);

public record LineupPlayerDto(
    int PlayerId,
    string Name,
    string Position,
    int ShirtNumber,
    bool IsStarting,
    int TeamId);

public record GoalEventDto(
    int Minute,
    int? ExtraMinute,
    int? ScorerPlayerId,
    string? ScorerName,
    int TeamId,
    string GoalType);

public record GroupPredictionsDto(
    int MatchId,
    string Status,
    int? HomeGoals,
    int? AwayGoals,
    List<MemberPredictionDto> Predictions);

public record MemberPredictionDto(
    Guid UserId,
    string FirstName,
    string LastName,
    int PredHome,
    int PredAway,
    List<ScorerPickDto> Scorers,
    int ProjectedPoints);

public record ScorerPickDto(int PlayerId, string Name, string Position);
