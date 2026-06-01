using System.Text.Json.Serialization;

namespace GoalGoalPredict.Infrastructure.ApiFootball;

internal class ApiResponse<T>
{
    [JsonPropertyName("response")]
    public List<T> Response { get; set; } = [];

    [JsonPropertyName("results")]
    public int Results { get; set; }
}

internal class TeamResponse
{
    [JsonPropertyName("team")]
    public ApiTeam Team { get; set; } = null!;
}

internal class ApiTeam
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("code")] public string? Code { get; set; }
    [JsonPropertyName("country")] public string Country { get; set; } = "";
    [JsonPropertyName("logo")] public string Logo { get; set; } = "";
}

internal class SquadResponse
{
    [JsonPropertyName("team")] public ApiTeamBrief Team { get; set; } = null!;
    [JsonPropertyName("players")] public List<ApiSquadPlayer> Players { get; set; } = [];
}

internal class ApiTeamBrief
{
    [JsonPropertyName("id")] public int Id { get; set; }
}

internal class ApiSquadPlayer
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("age")] public int Age { get; set; }
    [JsonPropertyName("number")] public int? Number { get; set; }
    [JsonPropertyName("position")] public string Position { get; set; } = "";
    [JsonPropertyName("photo")] public string Photo { get; set; } = "";
}

internal class FixtureResponse
{
    [JsonPropertyName("fixture")] public ApiFixture Fixture { get; set; } = null!;
    [JsonPropertyName("league")] public ApiLeague League { get; set; } = null!;
    [JsonPropertyName("teams")] public ApiTeams Teams { get; set; } = null!;
    [JsonPropertyName("goals")] public ApiGoals Goals { get; set; } = null!;
    [JsonPropertyName("score")] public ApiScore Score { get; set; } = null!;
}

internal class ApiFixture
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("date")] public string Date { get; set; } = "";
    [JsonPropertyName("timestamp")] public long Timestamp { get; set; }
    [JsonPropertyName("status")] public ApiStatus Status { get; set; } = null!;
}

internal class ApiStatus
{
    [JsonPropertyName("short")] public string Short { get; set; } = "";
    [JsonPropertyName("elapsed")] public int? Elapsed { get; set; }
}

internal class ApiLeague
{
    [JsonPropertyName("round")] public string Round { get; set; } = "";
}

internal class ApiTeams
{
    [JsonPropertyName("home")] public ApiTeamResult Home { get; set; } = null!;
    [JsonPropertyName("away")] public ApiTeamResult Away { get; set; } = null!;
}

internal class ApiTeamResult
{
    [JsonPropertyName("id")] public int Id { get; set; }
}

internal class ApiGoals
{
    [JsonPropertyName("home")] public int? Home { get; set; }
    [JsonPropertyName("away")] public int? Away { get; set; }
}

internal class ApiScore
{
    [JsonPropertyName("extratime")] public ApiHalfScore Extratime { get; set; } = null!;
    [JsonPropertyName("penalty")] public ApiHalfScore Penalty { get; set; } = null!;
}

internal class ApiHalfScore
{
    [JsonPropertyName("home")] public int? Home { get; set; }
    [JsonPropertyName("away")] public int? Away { get; set; }
}

internal class EventResponse
{
    [JsonPropertyName("time")] public ApiEventTime Time { get; set; } = null!;
    [JsonPropertyName("team")] public ApiEventTeam Team { get; set; } = null!;
    [JsonPropertyName("player")] public ApiEventPlayer Player { get; set; } = null!;
    [JsonPropertyName("type")] public string Type { get; set; } = "";
    [JsonPropertyName("detail")] public string Detail { get; set; } = "";
}

internal class ApiEventTime
{
    [JsonPropertyName("elapsed")] public int Elapsed { get; set; }
    [JsonPropertyName("extra")] public int? Extra { get; set; }
}

internal class ApiEventTeam
{
    [JsonPropertyName("id")] public int Id { get; set; }
}

internal class ApiEventPlayer
{
    [JsonPropertyName("id")] public int? Id { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
}

internal class LineupResponse
{
    [JsonPropertyName("team")] public ApiTeamBrief Team { get; set; } = null!;
    [JsonPropertyName("startXI")] public List<ApiLineupPlayerWrapper> StartXI { get; set; } = [];
    [JsonPropertyName("substitutes")] public List<ApiLineupPlayerWrapper> Substitutes { get; set; } = [];
}

internal class ApiLineupPlayerWrapper
{
    [JsonPropertyName("player")] public ApiLineupPlayer Player { get; set; } = null!;
}

internal class ApiLineupPlayer
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("number")] public int Number { get; set; }
    [JsonPropertyName("pos")] public string Pos { get; set; } = "";
}
