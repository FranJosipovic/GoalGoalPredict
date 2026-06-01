using System.Security.Claims;
using GoalGoalPredict.API.Filters;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.UseCases.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/sim")]
[Authorize]
[AdminOnly]
public class SimAdminController(
    AppDbContext db,
    CreateSimulationGroup createGroup,
    CreateSimulationMatch createMatch) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── Groups ────────────────────────────────────────────────────
    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups(CancellationToken ct)
    {
        var groups = await db.Groups
            .Where(g => g.IsSimulation)
            .Select(g => new { g.Id, g.Name, g.InviteCode, g.CreatedAt,
                Members = db.GroupMembers.Count(m => m.GroupId == g.Id) })
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync(ct);
        return Ok(groups);
    }

    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupBody body, CancellationToken ct)
    {
        var group = await createGroup.ExecuteAsync(UserId, body.Name, ct);
        return Ok(new { group.Id, group.Name, group.InviteCode });
    }

    // ── Matches ───────────────────────────────────────────────────
    [HttpGet("matches")]
    public async Task<IActionResult> GetMatches([FromQuery] Guid? groupId, CancellationToken ct)
    {
        var q = db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Source == "Simulation");

        if (groupId.HasValue)
            q = q.Where(m => m.SimulationGroupId == groupId);

        var matches = await q
            .OrderByDescending(m => m.KickoffUtc)
            .Select(m => new {
                m.Id, m.Status, m.KickoffUtc, m.Round,
                m.HomeGoals, m.AwayGoals, m.SimulationGroupId,
                HomeTeam = new { m.HomeTeam.Id, m.HomeTeam.Name, m.HomeTeam.LogoUrl },
                AwayTeam = new { m.AwayTeam.Id, m.AwayTeam.Name, m.AwayTeam.LogoUrl }
            })
            .ToListAsync(ct);
        return Ok(matches);
    }

    [HttpGet("matches/{id:int}")]
    public async Task<IActionResult> GetMatch(int id, CancellationToken ct)
    {
        var match = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (match is null) return NotFound();

        var lineup = await db.MatchLineupPlayers
            .Include(l => l.Player)
            .Where(l => l.MatchId == id)
            .Select(l => new { l.PlayerId, l.Player.Name, l.Position, l.ShirtNumber, l.IsStarting, l.TeamId })
            .ToListAsync(ct);

        var events = await db.SimulationEvents
            .Include(e => e.Player)
            .Where(e => e.MatchId == id)
            .OrderBy(e => e.Minute)
            .Select(e => new { e.Id, e.Minute, e.GoalType, e.IsProcessed, e.PlayerId, e.Player.Name, e.TeamId })
            .ToListAsync(ct);

        return Ok(new {
            match.Id, match.Status, match.KickoffUtc, match.Round, match.SimulationGroupId,
            match.HomeGoals, match.AwayGoals,
            HomeTeam = new { match.HomeTeam.Id, match.HomeTeam.Name, match.HomeTeam.Code, match.HomeTeam.LogoUrl },
            AwayTeam = new { match.AwayTeam.Id, match.AwayTeam.Name, match.AwayTeam.Code, match.AwayTeam.LogoUrl },
            Lineup = lineup,
            Events = events
        });
    }

    [HttpPost("matches")]
    public async Task<IActionResult> CreateMatch([FromBody] CreateSimMatchRequest req, CancellationToken ct)
    {
        var match = await createMatch.ExecuteAsync(req, ct);
        return Ok(new { match.Id, match.KickoffUtc, match.Status });
    }

    [HttpPut("matches/{id:int}/status")]
    public async Task<IActionResult> ForceStatus(int id, [FromBody] ForceStatusBody body, CancellationToken ct)
    {
        var match = await db.Matches.FindAsync([id], ct);
        if (match is null) return NotFound();
        match.UpdateFromApi(body.Status, body.ElapsedMinutes, match.HomeGoals, match.AwayGoals, null, null, null, null);
        await db.SaveChangesAsync(ct);
        return Ok(new { match.Id, match.Status });
    }

    // ── Seed admin ────────────────────────────────────────────────
    [HttpPost("make-admin")]
    [AllowAnonymous]
    public async Task<IActionResult> MakeAdmin([FromBody] MakeAdminBody body, [FromServices] IConfiguration config, CancellationToken ct)
    {
        var allowedEmails = config.GetSection("Admin:Emails").Get<List<string>>() ?? [];
        if (!allowedEmails.Contains(body.Email, StringComparer.OrdinalIgnoreCase))
            return Forbid();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == body.Email.ToLowerInvariant(), ct);
        if (user is null) return NotFound("User not found — register first");

        user.SetAdmin(true);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = $"{user.Email} is now admin" });
    }
}

public record CreateGroupBody(string Name);
public record ForceStatusBody(string Status, int? ElapsedMinutes);
public record MakeAdminBody(string Email);
