using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetMatches(AppDbContext db)
{
    private static readonly string[] FinishedStatuses = ["FT", "AET", "PEN"];

    // Returns every active (live + upcoming) match for the group, plus the most-recent
    // `finishedTake` finished matches. Finished history grows unbounded over a tournament,
    // so it's paged; active matches stay small and are always returned in full.
    // `finishedTake = null` returns all finished matches (no paging).
    public async Task<PagedMatchesDto> ExecuteAsync(Guid userId, Guid groupId, int? finishedTake = null, CancellationToken ct = default)
    {
        var baseQuery = db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Source == "ApiFootball"
                || (m.Source == "Simulation" && m.SimulationGroupId == groupId));

        var active = await baseQuery
            .Where(m => !FinishedStatuses.Contains(m.Status))
            .OrderBy(m => m.KickoffUtc)
            .ToListAsync(ct);

        var finishedQuery = baseQuery.Where(m => FinishedStatuses.Contains(m.Status));
        var finishedTotal = await finishedQuery.CountAsync(ct);

        var finishedOrdered = finishedQuery.OrderByDescending(m => m.KickoffUtc);
        var finished = finishedTake.HasValue
            ? await finishedOrdered.Take(finishedTake.Value).ToListAsync(ct)
            : await finishedOrdered.ToListAsync(ct);

        // Combine and present chronologically (the client re-sorts per tab as needed).
        var matches = active.Concat(finished).OrderBy(m => m.KickoffUtc).ToList();

        var matchIds = matches.Select(m => m.Id).ToList();
        var predictions = await db.Predictions
            .Include(p => p.GoalscorerPredictions)
            .Include(p => p.Score)
            .Where(p => p.UserId == userId && p.GroupId == groupId && matchIds.Contains(p.MatchId))
            .ToDictionaryAsync(p => p.MatchId, ct);

        var items = matches.Select(m =>
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

        return new PagedMatchesDto(items, finishedTotal);
    }

    public async Task<MatchDetailDto?> GetDetailAsync(int matchId, CancellationToken ct = default)
    {
        var m = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Include(m => m.LineupPlayers).ThenInclude(l => l.Player)
            .Include(m => m.Goals).ThenInclude(g => g.Scorer)
            .Include(m => m.Cards).ThenInclude(c => c.Player)
            .Include(m => m.Substitutions).ThenInclude(s => s.PlayerIn)
            .Include(m => m.Substitutions).ThenInclude(s => s.PlayerOut)
            .Include(m => m.VarDecisions).ThenInclude(v => v.Player)
            .AsSplitQuery()
            .FirstOrDefaultAsync(m => m.Id == matchId, ct);

        if (m is null) return null;

        // Lineups are only revealed to users 30 minutes before kickoff (and stay
        // visible once the match is under way), mirroring real-football behaviour.
        var revealUtc = m.KickoffUtc.AddMinutes(-30);
        var lineupsRevealed = DateTime.UtcNow >= revealUtc;

        var lineup = lineupsRevealed
            ? m.LineupPlayers
                .Select(l => new LineupPlayerDto(l.PlayerId, l.Player.Name, l.Position, l.ShirtNumber, l.IsStarting, l.TeamId, l.Player.PhotoUrl))
                .ToList()
            : new List<LineupPlayerDto>();

        var goals = m.Goals
            .OrderBy(g => g.Minute).ThenBy(g => g.ExtraMinute)
            .Select(g => new GoalEventDto(g.Minute, g.ExtraMinute, g.ScorerPlayerId, g.Scorer?.Name, g.TeamId, g.GoalType))
            .ToList();

        var cards = m.Cards
            .OrderBy(c => c.Minute).ThenBy(c => c.ExtraMinute)
            .Select(c => new CardEventDto(c.Minute, c.ExtraMinute, c.PlayerId, c.Player?.Name, c.TeamId, c.CardType))
            .ToList();

        var substitutions = m.Substitutions
            .OrderBy(s => s.Minute).ThenBy(s => s.ExtraMinute)
            .Select(s => new SubstitutionEventDto(
                s.Minute, s.ExtraMinute, s.TeamId,
                s.PlayerInId, s.PlayerIn?.Name,
                s.PlayerOutId, s.PlayerOut?.Name))
            .ToList();

        var varDecisions = m.VarDecisions
            .OrderBy(v => v.Minute).ThenBy(v => v.ExtraMinute)
            .Select(v => new VarDecisionEventDto(v.Minute, v.ExtraMinute, v.TeamId, v.PlayerId, v.Player?.Name, v.Detail))
            .ToList();

        return new MatchDetailDto(
            m.Id, m.Round, m.KickoffUtc, m.Status, m.ElapsedMinutes,
            new TeamSummaryDto(m.HomeTeam.Id, m.HomeTeam.Name, m.HomeTeam.Code, m.HomeTeam.LogoUrl),
            new TeamSummaryDto(m.AwayTeam.Id, m.AwayTeam.Name, m.AwayTeam.Code, m.AwayTeam.LogoUrl),
            m.HomeGoals, m.AwayGoals, lineup, goals, cards, substitutions, varDecisions, lineupsRevealed, revealUtc);
    }
}
