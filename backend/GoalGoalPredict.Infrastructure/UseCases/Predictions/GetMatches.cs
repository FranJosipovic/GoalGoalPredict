using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetMatches(AppDbContext db)
{
    public async Task<List<MatchListItemDto>> ExecuteAsync(Guid userId, Guid groupId, CancellationToken ct = default)
    {
        var matches = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Source == "ApiFootball"
                || (m.Source == "Simulation" && m.SimulationGroupId == groupId))
            .OrderBy(m => m.KickoffUtc)
            .ToListAsync(ct);

        var matchIds = matches.Select(m => m.Id).ToList();
        var predictions = await db.Predictions
            .Include(p => p.GoalscorerPredictions)
            .Include(p => p.Score)
            .Where(p => p.UserId == userId && p.GroupId == groupId && matchIds.Contains(p.MatchId))
            .ToDictionaryAsync(p => p.MatchId, ct);

        return matches.Select(m =>
        {
            predictions.TryGetValue(m.Id, out var pred);
            MyPredictionDto? myPred = pred is null ? null : new MyPredictionDto(
                pred.Id, pred.HomeGoals, pred.AwayGoals,
                pred.GoalscorerPredictions.Select(g => g.PlayerId).ToList(),
                pred.Score?.TotalPoints);

            return new MatchListItemDto(
                m.Id, m.Round, m.KickoffUtc, m.Status, m.ElapsedMinutes,
                new TeamSummaryDto(m.HomeTeam.Id, m.HomeTeam.Name, m.HomeTeam.Code, m.HomeTeam.LogoUrl),
                new TeamSummaryDto(m.AwayTeam.Id, m.AwayTeam.Name, m.AwayTeam.Code, m.AwayTeam.LogoUrl),
                m.HomeGoals, m.AwayGoals, myPred);
        }).ToList();
    }

    public async Task<MatchDetailDto?> GetDetailAsync(int matchId, CancellationToken ct = default)
    {
        var m = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Include(m => m.LineupPlayers).ThenInclude(l => l.Player)
            .Include(m => m.Goals).ThenInclude(g => g.Scorer)
            .FirstOrDefaultAsync(m => m.Id == matchId, ct);

        if (m is null) return null;

        var lineup = m.LineupPlayers
            .Select(l => new LineupPlayerDto(l.PlayerId, l.Player.Name, l.Position, l.ShirtNumber, l.IsStarting, l.TeamId))
            .ToList();

        var goals = m.Goals
            .OrderBy(g => g.Minute).ThenBy(g => g.ExtraMinute)
            .Select(g => new GoalEventDto(g.Minute, g.ExtraMinute, g.ScorerPlayerId, g.Scorer?.Name, g.TeamId, g.GoalType))
            .ToList();

        return new MatchDetailDto(
            m.Id, m.Round, m.KickoffUtc, m.Status, m.ElapsedMinutes,
            new TeamSummaryDto(m.HomeTeam.Id, m.HomeTeam.Name, m.HomeTeam.Code, m.HomeTeam.LogoUrl),
            new TeamSummaryDto(m.AwayTeam.Id, m.AwayTeam.Name, m.AwayTeam.Code, m.AwayTeam.LogoUrl),
            m.HomeGoals, m.AwayGoals, lineup, goals);
    }
}
