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

    public async Task<List<ApiSubstitutionEventData>> GetSubstitutionEventsAsync(int fixtureId, CancellationToken ct = default)
    {
        var json = await GetAsync($"fixtures/events?fixture={fixtureId}&type=subst", ct);
        var resp = Deserialize<ApiResponse<EventResponse>>(json);
        if (resp is null) return [];

        // API-Football substitution events: `assist` is the player coming ON,
        // `player` is the player going OFF.
        return resp.Response
            .Where(e => e.Type == "subst")
            .Select((e, i) => new ApiSubstitutionEventData(
                e.Time.Elapsed,
                e.Time.Extra,
                e.Team.Id,
                e.Assist?.Id,
                e.Player?.Id,
                i
            )).ToList();
    }

    public async Task<List<ApiVarEventData>> GetVarEventsAsync(int fixtureId, CancellationToken ct = default)
    {
        // API-Football's `type` filter only accepts goal/card/subst — VAR events come back
        // in the unfiltered events list, so fetch everything and pick out the "Var" ones.
        var json = await GetAsync($"fixtures/events?fixture={fixtureId}", ct);
        var resp = Deserialize<ApiResponse<EventResponse>>(json);
        if (resp is null) return [];

        return resp.Response
            .Where(e => e.Type == "Var")
            .Select((e, i) => new ApiVarEventData(
                e.Time.Elapsed,
                e.Time.Extra,
                e.Team.Id,
                e.Player?.Id,
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
            // API-Football can return a null player id for someone not in their DB —
            // we can't store a lineup row without a player, so skip those entries.
            foreach (var w in team.StartXI)
                if (w.Player?.Id is int pid)
                    result.Add(new ApiLineupPlayerData(pid, team.Team.Id, true, w.Player.Pos, w.Player.Number ?? 0));
            foreach (var w in team.Substitutes)
                if (w.Player?.Id is int pid)
                    result.Add(new ApiLineupPlayerData(pid, team.Team.Id, false, w.Player.Pos, w.Player.Number ?? 0));
        }
        return result;
    }

    public async Task<List<ApiStandingData>> GetStandingsAsync(CancellationToken ct = default)
    {
        var json = await GetAsync($"standings?league={LeagueId}&season={Season}", ct);
        var resp = Deserialize<ApiResponse<StandingsLeagueWrapper>>(json);
        var league = resp?.Response.FirstOrDefault()?.League;
        if (league is null) return [];

        var rows = new List<ApiStandingData>();
        foreach (var group in league.Standings)
            foreach (var r in group)
                rows.Add(new ApiStandingData(
                    r.Team.Id, r.Group ?? "", r.Rank, r.Points, r.GoalsDiff,
                    r.All.Played, r.All.Win, r.All.Draw, r.All.Lose,
                    r.All.Goals.For, r.All.Goals.Against,
                    r.Form ?? "", r.Description ?? ""));
        return rows;
    }

    public async Task<ApiTeamStatsData?> GetTeamStatisticsAsync(int teamId, CancellationToken ct = default)
    {
        var json = await GetAsync($"teams/statistics?league={LeagueId}&season={Season}&team={teamId}", ct);
        var env = Deserialize<StatsEnvelope>(json);
        var s = env?.Response;
        if (s is null) return null;

        return new ApiTeamStatsData(
            s.Form ?? "",
            s.Fixtures?.Played?.Total ?? 0,
            s.Fixtures?.Wins?.Total ?? 0,
            s.Fixtures?.Draws?.Total ?? 0,
            s.Fixtures?.Loses?.Total ?? 0,
            s.Goals?.For?.Total?.Total,
            s.Goals?.Against?.Total?.Total,
            s.CleanSheet?.Total ?? 0,
            s.FailedToScore?.Total ?? 0,
            s.Penalty?.Scored?.Total ?? 0,
            s.Penalty?.Missed?.Total ?? 0,
            s.Cards?.Yellow?.Values.Sum(v => v.Total ?? 0) ?? 0,
            s.Cards?.Red?.Values.Sum(v => v.Total ?? 0) ?? 0,
            s.Lineups?.OrderByDescending(l => l.Played ?? 0).FirstOrDefault()?.Formation);
    }

    public async Task<List<ApiTopScorerData>> GetTopScorersAsync(CancellationToken ct = default)
    {
        var json = await GetAsync($"players/topscorers?league={LeagueId}&season={Season}", ct);
        var resp = Deserialize<ApiResponse<TopScorerResponse>>(json);
        if (resp is null) return [];

        return resp.Response.Select((s, i) =>
        {
            var stat = s.Statistics.FirstOrDefault();
            return new ApiTopScorerData(
                s.Player.Id, s.Player.Name, s.Player.Photo ?? "", s.Player.Nationality ?? "",
                stat?.Team?.Id ?? 0, stat?.Team?.Name ?? "", stat?.Team?.Logo ?? "",
                stat?.Goals?.Total ?? 0, stat?.Goals?.Assists ?? 0,
                stat?.Games?.Appearences ?? 0, stat?.Games?.Minutes ?? 0,
                stat?.Penalty?.Scored ?? 0, i + 1);
        }).ToList();
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
