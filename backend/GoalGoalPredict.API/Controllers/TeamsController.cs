using GoalGoalPredict.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/teams")]
[Authorize]
public class TeamsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTeams(CancellationToken ct)
    {
        var teams = await db.Teams
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name, t.Code, t.Country, t.LogoUrl })
            .ToListAsync(ct);
        return Ok(teams);
    }

    // Returns the current (active) squad for selection contexts — predictions, lineup
    // builders. Pass includeInactive=true to also get cut/injured players (e.g. admin).
    [HttpGet("{id:int}/players")]
    public async Task<IActionResult> GetPlayers(int id, [FromQuery] bool includeInactive, CancellationToken ct)
    {
        var team = await db.Teams.FindAsync([id], ct);
        if (team is null) return NotFound();

        var players = await db.Players
            .Where(p => p.TeamId == id && (includeInactive || p.IsActive))
            .OrderBy(p => p.Position)
            .ThenBy(p => p.ShirtNumber)
            .Select(p => new { p.Id, p.Name, p.ShirtNumber, Position = p.Position.ToString(), p.PhotoUrl, p.Age })
            .ToListAsync(ct);

        return Ok(new { team = new { team.Id, team.Name, team.Code, team.LogoUrl }, players });
    }
}
