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
public record ApiLineupPlayerData(int PlayerId, int TeamId, bool IsStarting, string Position, int ShirtNumber);

public interface IApiFootballClient
{
    Task<List<ApiTeamData>> GetTeamsAsync(CancellationToken ct = default);
    Task<List<ApiSquadPlayerData>> GetSquadAsync(int teamId, CancellationToken ct = default);
    Task<List<ApiFixtureData>> GetFixturesAsync(CancellationToken ct = default);
    Task<ApiFixtureData?> GetFixtureAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiGoalEventData>> GetGoalEventsAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiCardEventData>> GetCardEventsAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiSubstitutionEventData>> GetSubstitutionEventsAsync(int fixtureId, CancellationToken ct = default);
    Task<List<ApiLineupPlayerData>> GetLineupsAsync(int fixtureId, CancellationToken ct = default);
}
