namespace GoalGoalPredict.Application.DTOs;

public record GuestPlayerDto(int Id, string Name, int ShirtNumber, string Position, string PhotoUrl);

public record GuestMatchDto(
    int Id, string KickoffUtc, string Status, string Round,
    TeamSummaryDto HomeTeam, TeamSummaryDto AwayTeam);

// Everything the landing-page guest predictor needs in one call: the nearest match, the
// default scoring rules to display, and both squads to pick scorers/cards from.
public record GuestNextMatchDto(
    GuestMatchDto Match,
    GroupScoringRulesDto Rules,
    List<GuestPlayerDto> HomePlayers,
    List<GuestPlayerDto> AwayPlayers);

public record GuestPredictRequest(
    string Email,
    int MatchId,
    int HomeGoals,
    int AwayGoals,
    List<ScorerPickInput> Scorers,
    List<CardPickInput> Cards);

// ── Admin insights ──
public record GuestPredictionAdminItem(
    Guid Id, string Email, int MatchId, string Home, string Away,
    int HomeGoals, int AwayGoals, int ScorerCount, int CardCount,
    bool IsScored, int? Points, bool Notified, string CreatedAt);

public record GuestPredictionAdminSummary(
    int Total, int UniqueEmails, int Scored, int Pending);

public record GuestPredictionAdminList(
    GuestPredictionAdminSummary Summary,
    List<GuestPredictionAdminItem> Items);
