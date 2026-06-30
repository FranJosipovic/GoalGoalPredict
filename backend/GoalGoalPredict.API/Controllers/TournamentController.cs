using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.UseCases.Tournament;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/tournament")]
[Authorize]
public class TournamentController(AppDbContext db, SyncTeamStatistics syncTeamStats) : ControllerBase
{
    private static readonly string[] FinishedStatuses = ["FT", "AET", "PEN"];

    // Group standings, grouped by "Group A".."Group L", ordered by rank within each.
    [HttpGet("standings")]
    public async Task<IActionResult> GetStandings(CancellationToken ct)
    {
        var rows = await db.Standings
            .Include(s => s.Team)
            .OrderBy(s => s.GroupName).ThenBy(s => s.Rank)
            .ToListAsync(ct);

        var groups = rows
            .GroupBy(s => s.GroupName)
            .Select(g => new StandingGroupDto(g.Key, g.Select(ToRowDto).ToList()))
            .ToList();

        return Ok(groups);
    }

    // Tournament top-scorers chart, ordered by rank.
    [HttpGet("topscorers")]
    public async Task<IActionResult> GetTopScorers(CancellationToken ct)
    {
        var scorers = await db.TopScorers
            .OrderBy(s => s.Rank)
            .Select(s => new TopScorerDto(
                s.PlayerId, s.Name, s.PhotoUrl, s.Nationality,
                s.TeamId, s.TeamName, s.TeamLogo,
                s.Goals, s.Assists, s.Appearances, s.Minutes, s.PenaltiesScored, s.Rank))
            .ToListAsync(ct);
        return Ok(scorers);
    }

    // Knockout fixtures for the bracket (not group-scoped). Carries live/final scores so the
    // bracket can show results and advance winners.
    [HttpGet("fixtures")]
    public async Task<IActionResult> GetFixtures(CancellationToken ct)
    {
        var matches = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Source == "ApiFootball")
            .OrderBy(m => m.KickoffUtc)
            .ToListAsync(ct);

        var dto = matches
            .Where(m => m.IsKnockout)
            .Select(m => new MatchListItemDto(
                m.Id, m.Round, m.KickoffUtc, m.Status, m.ElapsedMinutes,
                new TeamSummaryDto(m.HomeTeam.Id, m.HomeTeam.Name, m.HomeTeam.Code, m.HomeTeam.LogoUrl),
                new TeamSummaryDto(m.AwayTeam.Id, m.AwayTeam.Name, m.AwayTeam.Code, m.AwayTeam.LogoUrl),
                m.HomeGoals, m.AwayGoals, null,
                m.PenaltyHomeGoals, m.PenaltyAwayGoals))
            .ToList();

        return Ok(dto);
    }

    // Full team detail: summary, standing, statistics (lazily refreshed) and fixtures.
    [HttpGet("teams/{id:int}")]
    public async Task<IActionResult> GetTeamDetail(int id, CancellationToken ct)
    {
        var team = await db.Teams.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (team is null) return NotFound();

        // Lazily refresh stats if missing or stale (best-effort — never fail the request).
        var stats = await db.TeamStatistics.FirstOrDefaultAsync(s => s.TeamId == id, ct);
        if (stats is null || DateTime.UtcNow - stats.UpdatedAt > TimeSpan.FromMinutes(30))
        {
            try
            {
                await syncTeamStats.ExecuteAsync(id, ct);
                stats = await db.TeamStatistics.AsNoTracking().FirstOrDefaultAsync(s => s.TeamId == id, ct);
            }
            catch { /* keep whatever we had */ }
        }

        // A team can have rows in several tables; prefer its real group over the
        // aggregate "Group Stage" (best-thirds) table for the team header.
        var standingRows = await db.Standings.Where(s => s.TeamId == id).ToListAsync(ct);
        var standing = standingRows.FirstOrDefault(s => s.GroupName != "Group Stage")
                       ?? standingRows.FirstOrDefault();

        var matchRows = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Source == "ApiFootball" && (m.HomeTeamId == id || m.AwayTeamId == id))
            .OrderBy(m => m.KickoffUtc)
            .ToListAsync(ct);

        var matches = matchRows.Select(m =>
        {
            var isHome = m.HomeTeamId == id;
            var opp = isHome ? m.AwayTeam : m.HomeTeam;
            return new TeamMatchDto(
                m.Id, m.KickoffUtc, m.Status, m.Round,
                new TeamSummaryDto(opp.Id, opp.Name, opp.Code, opp.LogoUrl),
                isHome,
                isHome ? m.HomeGoals : m.AwayGoals,
                isHome ? m.AwayGoals : m.HomeGoals);
        }).ToList();

        var dto = new TeamDetailDto(
            new TeamSummaryDto(team.Id, team.Name, team.Code, team.LogoUrl),
            team.Country,
            standing is null ? null : ToRowDto(standing),
            stats is null ? null : new TeamStatsDto(
                stats.Form, stats.Played, stats.Wins, stats.Draws, stats.Loses,
                stats.GoalsFor, stats.GoalsAgainst, stats.CleanSheets, stats.FailedToScore,
                stats.PenaltyScored, stats.PenaltyMissed, stats.YellowCards, stats.RedCards,
                stats.Formation, stats.UpdatedAt),
            matches);

        return Ok(dto);
    }

    private static StandingRowDto ToRowDto(Domain.Entities.Standing s) => new(
        s.TeamId, s.Team?.Name ?? "", s.Team?.Code ?? "", s.Team?.LogoUrl ?? "",
        s.GroupName,
        s.Rank, s.Points, s.GoalsDiff, s.Played, s.Win, s.Draw, s.Lose,
        s.GoalsFor, s.GoalsAgainst, s.Form, s.Description);
}
