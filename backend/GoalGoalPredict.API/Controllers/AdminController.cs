using GoalGoalPredict.API.Filters;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.UseCases.Admin;
using GoalGoalPredict.Infrastructure.UseCases.Matches;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
[AdminOnly]
public class AdminController(
    SyncTeamsAndPlayers syncTeams,
    SyncFixtures syncFixtures,
    SyncMissingPlayers syncMissingPlayers,
    PrunePlayers prunePlayers,
    PollLiveMatch pollLiveMatch,
    SyncLineups syncLineups,
    AppDbContext db) : ControllerBase
{
    private static readonly string[] FinishedStatuses = ["FT", "AET", "PEN"];

    // Finished (API-Football) matches with their stored event + lineup counts, for the
    // admin "Match Events" sync panel. Most-recent kickoff first. Only finished matches
    // are listed — those are the ones with complete data worth backfilling.
    [HttpGet("matches")]
    public async Task<IActionResult> Matches(CancellationToken ct)
    {
        var matches = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Source == "ApiFootball" && FinishedStatuses.Contains(m.Status))
            .OrderByDescending(m => m.KickoffUtc)
            .Select(m => new {
                m.Id, m.KickoffUtc, m.Status, m.HomeGoals, m.AwayGoals, m.LastSyncedAt,
                Home = m.HomeTeam.Name, Away = m.AwayTeam.Name,
                Goals = m.Goals.Count, Cards = m.Cards.Count, Subs = m.Substitutions.Count,
                Var = m.VarDecisions.Count, Lineup = m.LineupPlayers.Count
            })
            .ToListAsync(ct);
        return Ok(matches);
    }

    // Pull fixture status + goal/card/substitution events from the API and
    // upsert only what's missing in the DB (idempotent).
    [HttpPost("matches/{id:int}/sync-events")]
    public async Task<IActionResult> SyncMatchEvents(int id, CancellationToken ct)
    {
        var match = await db.Matches.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (match is null) return NotFound();
        if (match.Source != "ApiFootball")
            return BadRequest(new { message = "Only real (API-Football) matches can sync events." });

        await pollLiveMatch.ExecuteAsync(id, ct);

        var goals = await db.MatchGoals.CountAsync(g => g.MatchId == id, ct);
        var cards = await db.MatchCards.CountAsync(c => c.MatchId == id, ct);
        var subs = await db.MatchSubstitutions.CountAsync(s => s.MatchId == id, ct);
        return Ok(new { message = $"Synced — {goals} goal(s), {cards} card(s), {subs} substitution(s).", goals, cards, subs });
    }

    // Pull starting XI + bench from the API. Skips if lineups are already stored
    // (SyncLineups is a no-op once LineupsAvailable is set).
    [HttpPost("matches/{id:int}/sync-lineups")]
    public async Task<IActionResult> SyncMatchLineups(int id, CancellationToken ct)
    {
        var match = await db.Matches.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (match is null) return NotFound();
        if (match.Source != "ApiFootball")
            return BadRequest(new { message = "Only real (API-Football) matches can sync lineups." });

        var alreadyHad = match.LineupsAvailable;
        await syncLineups.ExecuteAsync(id, ct);

        var lineup = await db.MatchLineupPlayers.CountAsync(l => l.MatchId == id, ct);
        var message = alreadyHad
            ? $"Lineups already stored — {lineup} player(s), nothing to fetch."
            : lineup > 0 ? $"Lineups synced — {lineup} player(s)." : "No lineups available from the API yet.";
        return Ok(new { message, lineup });
    }

    [HttpPost("sync-teams-players")]
    public async Task<IActionResult> SyncTeamsAndPlayers(CancellationToken ct)
    {
        await syncTeams.ExecuteAsync(ct);
        return Ok(new { message = "Teams and players synced" });
    }

    [HttpPost("sync-missing-players")]
    public async Task<IActionResult> SyncMissingPlayers(CancellationToken ct)
    {
        var added = await syncMissingPlayers.ExecuteAsync(ct);
        return Ok(new { message = $"Synced {added} players for teams with missing squads" });
    }

    [HttpPost("sync-fixtures")]
    public async Task<IActionResult> SyncFixtures(CancellationToken ct)
    {
        await syncFixtures.ExecuteAsync(ct);
        return Ok(new { message = "Fixtures synced" });
    }

    // Remove players that are no longer in the API squad, unless they are referenced
    // by predictions/lineups/goals/cards/sim events. teamId optional (omit = all teams).
    [HttpPost("prune-players")]
    public async Task<IActionResult> PrunePlayers([FromQuery] int? teamId, CancellationToken ct)
    {
        var result = await prunePlayers.ExecuteAsync(teamId, ct);
        return Ok(new {
            message = $"Removed {result.Removed} player(s), kept {result.Skipped.Count} in use" +
                      (result.SkippedTeams.Count > 0 ? $", skipped {result.SkippedTeams.Count} team(s) (no API data)" : ""),
            result.Removed, result.TeamsProcessed, result.Skipped, result.SkippedTeams
        });
    }

    // Soft toggle: deactivated players stay for history but are hidden from pickers.
    [HttpPost("players/{playerId:int}/active")]
    public async Task<IActionResult> SetPlayerActive(int playerId, [FromBody] SetPlayerActiveBody body, CancellationToken ct)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId, ct);
        if (player is null) return NotFound();
        if (body.IsActive) player.Activate(); else player.Deactivate();
        await db.SaveChangesAsync(ct);
        return Ok(new { player.Id, player.IsActive });
    }

    // Hard-delete a single player (refused if referenced).
    [HttpDelete("players/{playerId:int}")]
    public async Task<IActionResult> DeletePlayer(int playerId, CancellationToken ct)
    {
        var result = await prunePlayers.DeleteOneAsync(playerId, ct);
        return result.Success ? Ok(new { result.Message }) : BadRequest(new { result.Message });
    }

    public record SetPlayerActiveBody(bool IsActive);

    [HttpGet("status")]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        var teamCount = await db.Teams.CountAsync(ct);
        var playerCount = await db.Players.CountAsync(ct);
        var matchCount = await db.Matches.CountAsync(ct);
        var teamsWithoutPlayers = await db.Teams
            .Where(t => !db.Players.Any(p => p.TeamId == t.Id))
            .Select(t => new { t.Id, t.Name })
            .ToListAsync(ct);

        return Ok(new { teamCount, playerCount, matchCount, teamsWithoutPlayers });
    }

    // System + background-job health, derived from the DB (no shared scheduler state).
    [HttpGet("system")]
    public async Task<IActionResult> System(CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        var users = await db.Users.CountAsync(ct);
        var admins = await db.Users.CountAsync(u => u.IsAdmin, ct);
        var groups = await db.Groups.CountAsync(ct);
        var simGroups = await db.Groups.CountAsync(g => g.IsSimulation, ct);
        var realGroups = groups - simGroups;
        var predictions = await db.Predictions.CountAsync(ct);
        var pushSubs = await db.PushSubscriptions.CountAsync(ct);

        var teams = await db.Teams.CountAsync(ct);
        var players = await db.Players.CountAsync(ct);
        var matches = await db.Matches.CountAsync(ct);
        var teamsWithoutPlayers = await db.Teams.CountAsync(t => !db.Players.Any(p => p.TeamId == t.Id), ct);

        // Real (API-Football) sync health
        var lastFixtureSync = await db.Matches
            .Where(m => m.Source == "ApiFootball")
            .OrderByDescending(m => m.LastSyncedAt)
            .Select(m => (DateTime?)m.LastSyncedAt)
            .FirstOrDefaultAsync(ct);
        var lastTeamSync = await db.Teams
            .OrderByDescending(t => t.SyncedAt)
            .Select(t => (DateTime?)t.SyncedAt)
            .FirstOrDefaultAsync(ct);

        var liveMatches = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Status == "1H" || m.Status == "HT" || m.Status == "2H" || m.Status == "ET" || m.Status == "P")
            .OrderBy(m => m.KickoffUtc)
            .Select(m => new {
                m.Id, m.Status, m.Source, m.ElapsedMinutes, m.HomeGoals, m.AwayGoals, m.LastSyncedAt,
                Home = m.HomeTeam.Name, Away = m.AwayTeam.Name
            })
            .ToListAsync(ct);

        var upcoming = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Status == "NS" && m.KickoffUtc > now)
            .OrderBy(m => m.KickoffUtc)
            .Take(5)
            .Select(m => new {
                m.Id, m.KickoffUtc, m.Source, m.LineupsAvailable,
                Home = m.HomeTeam.Name, Away = m.AwayTeam.Name
            })
            .ToListAsync(ct);

        return Ok(new {
            entities = new { users, admins, groups, realGroups, simGroups, predictions, pushSubs, teams, players, matches, teamsWithoutPlayers },
            sync = new { lastFixtureSync, lastTeamSync, serverTimeUtc = now },
            liveMatches,
            upcoming
        });
    }
}
