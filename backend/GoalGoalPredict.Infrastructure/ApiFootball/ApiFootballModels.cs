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
    [JsonPropertyName("assist")] public ApiEventPlayer? Assist { get; set; }
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

// ── Standings ──────────────────────────────────────────────────
internal class StandingsLeagueWrapper
{
    [JsonPropertyName("league")] public StandingsLeague League { get; set; } = null!;
}

internal class StandingsLeague
{
    // standings is an array of groups, each group an array of team rows.
    [JsonPropertyName("standings")] public List<List<ApiStandingRow>> Standings { get; set; } = [];
}

internal class ApiStandingRow
{
    [JsonPropertyName("rank")] public int Rank { get; set; }
    [JsonPropertyName("team")] public ApiTeamBrief Team { get; set; } = null!;
    [JsonPropertyName("points")] public int Points { get; set; }
    [JsonPropertyName("goalsDiff")] public int GoalsDiff { get; set; }
    [JsonPropertyName("group")] public string? Group { get; set; }
    [JsonPropertyName("form")] public string? Form { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("all")] public ApiStandingAll All { get; set; } = new();
}

internal class ApiStandingAll
{
    [JsonPropertyName("played")] public int Played { get; set; }
    [JsonPropertyName("win")] public int Win { get; set; }
    [JsonPropertyName("draw")] public int Draw { get; set; }
    [JsonPropertyName("lose")] public int Lose { get; set; }
    [JsonPropertyName("goals")] public ApiStandingGoals Goals { get; set; } = new();
}

internal class ApiStandingGoals
{
    [JsonPropertyName("for")] public int For { get; set; }
    [JsonPropertyName("against")] public int Against { get; set; }
}

// ── Team statistics ────────────────────────────────────────────
// The statistics endpoint returns `response` as a single object (not an array),
// so it needs its own envelope rather than the shared ApiResponse<T>.
internal class StatsEnvelope
{
    [JsonPropertyName("response")] public StatsResponse? Response { get; set; }
}

internal class StatsResponse
{
    [JsonPropertyName("form")] public string? Form { get; set; }
    [JsonPropertyName("fixtures")] public ApiStatsFixtures? Fixtures { get; set; }
    [JsonPropertyName("goals")] public ApiStatsGoals? Goals { get; set; }
    [JsonPropertyName("clean_sheet")] public ApiStatsHomeAwayTotal? CleanSheet { get; set; }
    [JsonPropertyName("failed_to_score")] public ApiStatsHomeAwayTotal? FailedToScore { get; set; }
    [JsonPropertyName("penalty")] public ApiStatsPenalty? Penalty { get; set; }
    [JsonPropertyName("lineups")] public List<ApiStatsLineup>? Lineups { get; set; }
    [JsonPropertyName("cards")] public ApiStatsCards? Cards { get; set; }
}

internal class ApiStatsFixtures
{
    [JsonPropertyName("played")] public ApiStatsHomeAwayTotal? Played { get; set; }
    [JsonPropertyName("wins")] public ApiStatsHomeAwayTotal? Wins { get; set; }
    [JsonPropertyName("draws")] public ApiStatsHomeAwayTotal? Draws { get; set; }
    [JsonPropertyName("loses")] public ApiStatsHomeAwayTotal? Loses { get; set; }
}

internal class ApiStatsHomeAwayTotal
{
    [JsonPropertyName("total")] public int? Total { get; set; }
}

internal class ApiStatsGoals
{
    [JsonPropertyName("for")] public ApiStatsGoalSide? For { get; set; }
    [JsonPropertyName("against")] public ApiStatsGoalSide? Against { get; set; }
}

internal class ApiStatsGoalSide
{
    [JsonPropertyName("total")] public ApiStatsHomeAwayTotal? Total { get; set; }
}

internal class ApiStatsPenalty
{
    [JsonPropertyName("scored")] public ApiStatsHomeAwayTotal? Scored { get; set; }
    [JsonPropertyName("missed")] public ApiStatsHomeAwayTotal? Missed { get; set; }
}

internal class ApiStatsLineup
{
    [JsonPropertyName("formation")] public string? Formation { get; set; }
    [JsonPropertyName("played")] public int? Played { get; set; }
}

internal class ApiStatsCards
{
    [JsonPropertyName("yellow")] public Dictionary<string, ApiStatsCardInterval>? Yellow { get; set; }
    [JsonPropertyName("red")] public Dictionary<string, ApiStatsCardInterval>? Red { get; set; }
}

internal class ApiStatsCardInterval
{
    [JsonPropertyName("total")] public int? Total { get; set; }
}

// ── Top scorers ────────────────────────────────────────────────
internal class TopScorerResponse
{
    [JsonPropertyName("player")] public ApiScorerPlayer Player { get; set; } = null!;
    [JsonPropertyName("statistics")] public List<ApiScorerStatistics> Statistics { get; set; } = [];
}

internal class ApiScorerPlayer
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = "";
    [JsonPropertyName("nationality")] public string? Nationality { get; set; }
    [JsonPropertyName("photo")] public string? Photo { get; set; }
}

internal class ApiScorerStatistics
{
    [JsonPropertyName("team")] public ApiScorerTeam? Team { get; set; }
    [JsonPropertyName("games")] public ApiScorerGames? Games { get; set; }
    [JsonPropertyName("goals")] public ApiScorerGoals? Goals { get; set; }
    [JsonPropertyName("penalty")] public ApiScorerPenalty? Penalty { get; set; }
}

internal class ApiScorerTeam
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("logo")] public string? Logo { get; set; }
}

internal class ApiScorerGames
{
    [JsonPropertyName("appearences")] public int? Appearences { get; set; }
    [JsonPropertyName("minutes")] public int? Minutes { get; set; }
}

internal class ApiScorerGoals
{
    [JsonPropertyName("total")] public int? Total { get; set; }
    [JsonPropertyName("assists")] public int? Assists { get; set; }
}

internal class ApiScorerPenalty
{
    [JsonPropertyName("scored")] public int? Scored { get; set; }
}
