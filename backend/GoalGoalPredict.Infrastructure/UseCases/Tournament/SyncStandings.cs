using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Tournament;

// Pulls the tournament group standings from the API and upserts one row per team.
// Cheap (a single API call); run on startup and after each match finishes.
public class SyncStandings(AppDbContext db, IApiFootballClient api, ILogger<SyncStandings> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var rows = await api.GetStandingsAsync(ct);
        if (rows.Count == 0)
        {
            logger.LogInformation("No standings returned from API");
            return;
        }

        // Only keep standings for teams we actually have (FK safety). A team can appear in
        // several tables (its group + the best-thirds "Group Stage" ranking), so rebuild
        // the whole table rather than upserting by team id.
        var knownTeams = await db.Teams.Select(t => t.Id).ToHashSetAsync(ct);
        await db.Standings.ExecuteDeleteAsync(ct);

        foreach (var r in rows)
        {
            if (!knownTeams.Contains(r.TeamId)) continue;
            var row = Standing.Create(r.TeamId);
            row.Update(r.GroupName, r.Rank, r.Points, r.GoalsDiff,
                r.Played, r.Win, r.Draw, r.Lose, r.GoalsFor, r.GoalsAgainst,
                r.Form, r.Description);
            db.Standings.Add(row);
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Standings synced: {Count} rows", rows.Count);
    }
}

// Pulls the tournament top-scorers chart and rebuilds the table (~20 rows). A single
// API call; run on startup and after each match finishes.
public class SyncTopScorers(AppDbContext db, IApiFootballClient api, ILogger<SyncTopScorers> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var scorers = await api.GetTopScorersAsync(ct);
        if (scorers.Count == 0)
        {
            logger.LogInformation("No top scorers returned from API");
            return;
        }

        // The chart is small and reorders frequently — clear and rebuild from rank order.
        await db.TopScorers.ExecuteDeleteAsync(ct);
        foreach (var s in scorers)
            db.TopScorers.Add(TopScorer.Create(
                s.PlayerId, s.Name, s.PhotoUrl, s.Nationality,
                s.TeamId, s.TeamName, s.TeamLogo,
                s.Goals, s.Assists, s.Appearances, s.Minutes, s.PenaltiesScored, s.Rank));

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Top scorers synced: {Count} rows", scorers.Count);
    }
}

// Pulls one team's statistics and upserts the curated row. Costs one API call per team,
// so it's refreshed lazily (team page open) and for the two teams of a finished match.
public class SyncTeamStatistics(AppDbContext db, IApiFootballClient api, ILogger<SyncTeamStatistics> logger)
{
    public async Task ExecuteAsync(int teamId, CancellationToken ct = default)
    {
        if (!await db.Teams.AnyAsync(t => t.Id == teamId, ct)) return;

        var s = await api.GetTeamStatisticsAsync(teamId, ct);
        if (s is null)
        {
            logger.LogInformation("No statistics returned for team {TeamId}", teamId);
            return;
        }

        var row = await db.TeamStatistics.FirstOrDefaultAsync(x => x.TeamId == teamId, ct);
        if (row is null)
        {
            row = TeamStatistics.Create(teamId);
            db.TeamStatistics.Add(row);
        }

        row.Update(s.Form, s.Played, s.Wins, s.Draws, s.Loses,
            s.GoalsFor, s.GoalsAgainst, s.CleanSheets, s.FailedToScore,
            s.PenaltyScored, s.PenaltyMissed, s.YellowCards, s.RedCards, s.Formation);

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Statistics synced for team {TeamId}", teamId);
    }
}
