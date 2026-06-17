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

// Paged match list: all active (live + upcoming) matches plus a most-recent window of
// finished matches. FinishedTotal lets the client show a "load more" control.
public record PagedMatchesDto(
    List<MatchListItemDto> Matches,
    int FinishedTotal);

// Paged "my picks": all active picks + a most-recent window of finished ones, with
// aggregate stats computed over ALL the user's picks (not just the returned page).
public record PagedMyPredictionsDto(
    List<MyPredictionItemDto> Items,
    int FinishedTotal,
    int TotalPicks,
    int TotalPoints,
    int ExactCount);

// A single member's prediction history, paged latest-first. Stats are aggregated
// over ALL their picks (cheap SQL sums), so the hero header stays correct no
// matter how many pages are loaded.
public record PagedUserPredictionsDto(
    List<MyPredictionItemDto> Items,
    int Total,
    int TotalPoints,
    int ExactCount,
    int ScorerPoints);

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
    int TeamId,
    string PhotoUrl);

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
