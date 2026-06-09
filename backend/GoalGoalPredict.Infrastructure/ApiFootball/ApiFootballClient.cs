using System.Text.Json;
using GoalGoalPredict.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.ApiFootball;

public class ApiFootballClient(HttpClient http, IConfiguration config, ILogger<ApiFootballClient> logger) : IApiFootballClient
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private const int LeagueId = 1;
    private const int Season = 2026;

    public async Task<List<ApiTeamData>> GetTeamsAsync(CancellationToken ct = default)
    {
        var json = await GetAsync($"teams?league={LeagueId}&season={Season}", ct);
        var resp = Deserialize<ApiResponse<TeamResponse>>(json);
        return resp?.Response.Select(t => new ApiTeamData(
            t.Team.Id, t.Team.Name, t.Team.Code ?? "", t.Team.Country, t.Team.Logo
        )).ToList() ?? [];
    }

    public async Task<List<ApiSquadPlayerData>> GetSquadAsync(int teamId, CancellationToken ct = default)
    {
        var json = await GetAsync($"players/squads?team={teamId}", ct);
        var resp = Deserialize<ApiResponse<SquadResponse>>(json);
        if (resp?.Response is not { Count: > 0 } response) return [];
        return response[0].Players.Select(p => new ApiSquadPlayerData(
            p.Id, p.Name, p.Age, p.Number ?? 0, p.Position, p.Photo
        )).ToList();
    }

    public async Task<List<ApiFixtureData>> GetFixturesAsync(CancellationToken ct = default)
    {
        var json = await GetAsync($"fixtures?league={LeagueId}&season={Season}", ct);
        return ParseFixtures(json);
    }

    public async Task<ApiFixtureData?> GetFixtureAsync(int fixtureId, CancellationToken ct = default)
    {
        var json = await GetAsync($"fixtures?id={fixtureId}", ct);
        var list = ParseFixtures(json);
        return list.FirstOrDefault();
    }

    public async Task<List<ApiGoalEventData>> GetGoalEventsAsync(int fixtureId, CancellationToken ct = default)
    {
        var json = await GetAsync($"fixtures/events?fixture={fixtureId}&type=Goal", ct);
        var resp = Deserialize<ApiResponse<EventResponse>>(json);
        if (resp is null) return [];

        return resp.Response
            .Where(e => e.Type == "Goal")
            .Select((e, i) => new ApiGoalEventData(
                e.Time.Elapsed,
                e.Time.Extra,
                e.Team.Id,
                e.Player.Id,
                e.Detail,
                i
            )).ToList();
    }

    public async Task<List<ApiCardEventData>> GetCardEventsAsync(int fixtureId, CancellationToken ct = default)
    {
        var json = await GetAsync($"fixtures/events?fixture={fixtureId}&type=Card", ct);
        var resp = Deserialize<ApiResponse<EventResponse>>(json);
        if (resp is null) return [];

        return resp.Response
            .Where(e => e.Type == "Card")
            .Select((e, i) => new ApiCardEventData(
                e.Time.Elapsed,
                e.Time.Extra,
                e.Team.Id,
                e.Player.Id,
                e.Detail,
                i
            )).ToList();
    }

    public async Task<List<ApiLineupPlayerData>> GetLineupsAsync(int fixtureId, CancellationToken ct = default)
    {
        var json = await GetAsync($"fixtures/lineups?fixture={fixtureId}", ct);
        var resp = Deserialize<ApiResponse<LineupResponse>>(json);
        if (resp is null) return [];

        var result = new List<ApiLineupPlayerData>();
        foreach (var team in resp.Response)
        {
            foreach (var w in team.StartXI)
                result.Add(new ApiLineupPlayerData(w.Player.Id, team.Team.Id, true, w.Player.Pos, w.Player.Number));
            foreach (var w in team.Substitutes)
                result.Add(new ApiLineupPlayerData(w.Player.Id, team.Team.Id, false, w.Player.Pos, w.Player.Number));
        }
        return result;
    }

    private async Task<string> GetAsync(string path, CancellationToken ct)
    {
        var key = config["ApiFootball:ApiKey"];
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("x-apisports-key", key);

        var response = await http.SendAsync(request, ct);

        if (response.Headers.TryGetValues("X-RateLimit-Remaining", out var remaining))
            logger.LogDebug("API Football quota remaining: {Remaining}", string.Join(",", remaining));

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("API Football returned {Status} for {Path}", response.StatusCode, path);
            return "{}";
        }

        return await response.Content.ReadAsStringAsync(ct);
    }

    private List<ApiFixtureData> ParseFixtures(string json)
    {
        var resp = Deserialize<ApiResponse<FixtureResponse>>(json);
        return resp?.Response.Select(f => new ApiFixtureData(
            f.Fixture.Id,
            f.League.Round,
            f.Teams.Home.Id,
            f.Teams.Away.Id,
            DateTimeOffset.FromUnixTimeSeconds(f.Fixture.Timestamp).UtcDateTime,
            f.Fixture.Status.Short,
            f.Fixture.Status.Elapsed,
            f.Goals.Home, f.Goals.Away,
            f.Score.Extratime?.Home, f.Score.Extratime?.Away,
            f.Score.Penalty?.Home, f.Score.Penalty?.Away
        )).ToList() ?? [];
    }

    private T? Deserialize<T>(string json)
    {
        try { return JsonSerializer.Deserialize<T>(json, JsonOpts); }
        catch (Exception ex)
        {
            logger.LogError(ex, "JSON deserialization failed for type {Type}. JSON snippet: {Snippet}",
                typeof(T).Name, json.Length > 200 ? json[..200] : json);
            return default;
        }
    }
}
