namespace GoalGoalPredict.Application.Interfaces;

public record ApiTeamData(int Id, string Name, string Code, string Country, string LogoUrl);
public record ApiSquadPlayerData(int Id, string Name, int Age, int Number, string Position, string PhotoUrl);
public record ApiFixtureData(
    int Id, string Round,
    int HomeTeamId, int AwayTeamId,
    DateTime KickoffUtc, string Status, int? ElapsedMinutes,
    int? HomeGoals, int? AwayGoals,
    int? EtHomeGoals, int? EtAwayGoals,
    int? PenHomeGoals, int? PenAwayGoals);
public record ApiGoalEventData(int Minute, int? ExtraMinute, int TeamId, int? ScorerPlayerId, string GoalType, int Order);
public record ApiCardEventData(int Minute, int? ExtraMinute, int TeamId, int? PlayerId, string CardType, int Order);
public record ApiSubstitutionEventData(int Minute, int? ExtraMinute, int TeamId, int? PlayerInId, int? PlayerOutId, int Order);
public record ApiVarEventData(int Minute, int? ExtraMinute, int TeamId, int? PlayerId, string Detail, int Order);
public record ApiLineupPlayerData(int PlayerId, int TeamId, bool IsStarting, string Position, int ShirtNumber);
public record ApiStandingData(
    int TeamId, string GroupName, int Rank, int Points, int GoalsDiff,
    int Played, int Win, int Draw, int Lose, int GoalsFor, int GoalsAgainst,
    string Form, string Description);
public record ApiTeamStatsData(
    string Form, int Played, int Wins, int Draws, int Loses,
    int? GoalsFor, int? GoalsAgainst, int CleanSheets, int FailedToScore,
    int PenaltyScored, int PenaltyMissed, int YellowCards, int RedCards, string? Formation);
public record ApiTopScorerData(
    int PlayerId, string Name, string PhotoUrl, string Nationality,
    int TeamId, string TeamName, string TeamLogo,
    int Goals, int Assists, int Appearances, int Minutes, int PenaltiesScored, int Rank);

public interface IApiFootballClient
{
    Task<List<ApiTeamData>> GetTeamsAsync(CancellationToken ct = default);
    Task<List<ApiSquadPlayerData>> GetSquadAsync(int teamId, CancellationToken ct = default);
    Task<List<ApiFixtureData>> GetFixturesAsync(CancellationToken ct = default);
    Task<ApiFixtureData?> GetFixtureAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiGoalEventData>> GetGoalEventsAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiCardEventData>> GetCardEventsAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiSubstitutionEventData>> GetSubstitutionEventsAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiVarEventData>> GetVarEventsAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiLineupPlayerData>> GetLineupsAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiStandingData>> GetStandingsAsync(CancellationToken ct = default);
    Task<ApiTeamStatsData?> GetTeamStatisticsAsync(int teamId, CancellationToken ct = default);
    Task<List<ApiTopScorerData>> GetTopScorersAsync(CancellationToken ct = default);
}
