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
    List<GoalEventDto> Goals,
    List<CardEventDto> Cards,
    List<SubstitutionEventDto> Substitutions,
    List<VarDecisionEventDto> VarDecisions,
    bool LineupsRevealed,
    DateTime LineupRevealUtc);

public record VarDecisionEventDto(
    int Minute,
    int? ExtraMinute,
    int TeamId,
    int? PlayerId,
    string? PlayerName,
    string Detail);

public record SubstitutionEventDto(
    int Minute,
    int? ExtraMinute,
    int TeamId,
    int? PlayerInId,
    string? PlayerInName,
    int? PlayerOutId,
    string? PlayerOutName);

public record CardEventDto(
    int Minute,
    int? ExtraMinute,
    int? PlayerId,
    string? PlayerName,
    int TeamId,
    string CardType);

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
    List<CardPickDto> Cards,
    int ProjectedPoints);

public record ScorerPickDto(int PlayerId, string Name, string Position, string GoalType, int TeamId, int PointsAwarded = 0);

public record CardPickDto(int PlayerId, string Name, string Kind, int TeamId, int PointsAwarded = 0);

public record MyPredictionItemDto(
    int MatchId,
    string Round,
    DateTime KickoffUtc,
    string Status,
    TeamSummaryDto HomeTeam,
    TeamSummaryDto AwayTeam,
    int? ActualHome,
    int? ActualAway,
    int PredHome,
    int PredAway,
    List<ScorerPickDto> Scorers,
    List<CardPickDto> Cards,
    int? Points,
    int ProjectedPoints,
    bool IsScored);
