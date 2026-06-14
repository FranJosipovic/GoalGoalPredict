namespace GoalGoalPredict.Application.DTOs;

public record StandingRowDto(
    int TeamId, string TeamName, string TeamCode, string LogoUrl,
    string GroupName,
    int Rank, int Points, int GoalsDiff,
    int Played, int Win, int Draw, int Lose,
    int GoalsFor, int GoalsAgainst,
    string Form, string Description);

public record StandingGroupDto(string GroupName, List<StandingRowDto> Rows);

public record TeamStatsDto(
    string Form, int Played, int Wins, int Draws, int Loses,
    int? GoalsFor, int? GoalsAgainst, int CleanSheets, int FailedToScore,
    int PenaltyScored, int PenaltyMissed, int YellowCards, int RedCards,
    string? Formation, DateTime UpdatedAt);

public record TeamMatchDto(
    int Id, DateTime KickoffUtc, string Status, string Round,
    TeamSummaryDto Opponent, bool IsHome,
    int? TeamGoals, int? OpponentGoals);

public record TopScorerDto(
    int PlayerId, string Name, string PhotoUrl, string Nationality,
    int TeamId, string TeamName, string TeamLogo,
    int Goals, int Assists, int Appearances, int Minutes, int PenaltiesScored, int Rank);

public record TeamDetailDto(
    TeamSummaryDto Team,
    string? Country,
    StandingRowDto? Standing,
    TeamStatsDto? Stats,
    List<TeamMatchDto> Matches);
