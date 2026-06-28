using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetMyPredictions(AppDbContext db, EffectiveRulesService effectiveRules)
{
    private static readonly string[] FinishedStatuses = ["FT", "AET", "PEN"];

    private IQueryable<Prediction> BaseQuery(Guid userId, Guid groupId) => db.Predictions
        .Include(p => p.Match).ThenInclude(m => m.HomeTeam)
        .Include(p => p.Match).ThenInclude(m => m.AwayTeam)
        .Include(p => p.Match).ThenInclude(m => m.Goals)
        .Include(p => p.Match).ThenInclude(m => m.Cards)
        .Include(p => p.GoalscorerPredictions).ThenInclude(g => g.Player)
        .Include(p => p.CardPredictions).ThenInclude(c => c.Player)
        .Include(p => p.Score)
        .AsSplitQuery()
        .Where(p => p.UserId == userId && p.GroupId == groupId);

    public async Task<List<MyPredictionItemDto>> ExecuteAsync(Guid userId, Guid groupId, bool onlyStarted = false, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var predictions = await BaseQuery(userId, groupId)
            // When viewing another member, hide picks for matches that haven't kicked off.
            .Where(p => !onlyStarted || p.Match.KickoffUtc <= now)
            .ToListAsync(ct);

        return await BuildAsync(groupId, predictions, ct);
    }

    // A member's history paged latest-first: the most-recent `take` picks, plus a total
    // count and aggregate stats computed over ALL their picks (cheap SQL sums) so the
    // header stays correct as more pages load.
    public async Task<PagedUserPredictionsDto> ExecuteUserPagedAsync(Guid userId, Guid groupId, bool onlyStarted, int take, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var scoped = BaseQuery(userId, groupId)
            // When viewing another member, hide picks for matches that haven't kicked off.
            .Where(p => !onlyStarted || p.Match.KickoffUtc <= now);

        var total = await scoped.CountAsync(ct);
        var page = await scoped
            .OrderByDescending(p => p.Match.KickoffUtc)
            .Take(take)
            .ToListAsync(ct);

        var items = await BuildAsync(groupId, page, ct);

        var totalPoints = await db.PredictionScores
            .Where(s => s.UserId == userId && s.GroupId == groupId)
            .SumAsync(s => (int?)s.TotalPoints, ct) ?? 0;
        var scorerPoints = await db.PredictionScores
            .Where(s => s.UserId == userId && s.GroupId == groupId)
            .SumAsync(s => (int?)(s.GoalscorerPoints + s.OwnGoalPoints), ct) ?? 0;
        var exactCount = await db.Predictions.CountAsync(p =>
            p.UserId == userId && p.GroupId == groupId && p.Score != null
            && p.Match.HomeGoals == p.HomeGoals && p.Match.AwayGoals == p.AwayGoals, ct);

        return new PagedUserPredictionsDto(items, total, totalPoints, exactCount, scorerPoints);
    }

    // Active (live + upcoming) picks in full, plus the most-recent `finishedTake` finished
    // picks. Aggregate stats are computed over ALL of the user's picks, so the Picks-tab
    // summary stays correct regardless of how many finished picks are loaded.
    public async Task<PagedMyPredictionsDto> ExecutePagedAsync(Guid userId, Guid groupId, int finishedTake, CancellationToken ct = default)
    {
        var active = await BaseQuery(userId, groupId)
            .Where(p => !FinishedStatuses.Contains(p.Match.Status))
            .ToListAsync(ct);

        var finishedQuery = BaseQuery(userId, groupId).Where(p => FinishedStatuses.Contains(p.Match.Status));
        var finishedTotal = await finishedQuery.CountAsync(ct);
        var finished = await finishedQuery
            .OrderByDescending(p => p.Match.KickoffUtc)
            .Take(finishedTake)
            .ToListAsync(ct);

        var items = await BuildAsync(groupId, active.Concat(finished).ToList(), ct);

        var totalPicks = await db.Predictions.CountAsync(p => p.UserId == userId && p.GroupId == groupId, ct);
        var totalPoints = await db.PredictionScores
            .Where(s => s.UserId == userId && s.GroupId == groupId)
            .SumAsync(s => (int?)s.TotalPoints, ct) ?? 0;
        var exactCount = await db.Predictions.CountAsync(p =>
            p.UserId == userId && p.GroupId == groupId && p.Score != null
            && p.Match.HomeGoals == p.HomeGoals && p.Match.AwayGoals == p.AwayGoals, ct);

        return new PagedMyPredictionsDto(items, finishedTotal, totalPicks, totalPoints, exactCount);
    }

    private async Task<List<MyPredictionItemDto>> BuildAsync(Guid groupId, List<Prediction> predictions, CancellationToken ct)
    {
        // Per-match rules: started matches use their frozen kickoff snapshot, upcoming use live.
        var rulesByMatch = new Dictionary<int, GroupScoringRules>();
        foreach (var m in predictions.Select(p => p.Match).DistinctBy(m => m.Id))
            rulesByMatch[m.Id] = await effectiveRules.GetForMatchAsync(groupId, m, createIfMissing: false, ct);

        return predictions
            .OrderBy(p => p.Match.KickoffUtc)
            .Select(p =>
            {
                var m = p.Match;
                var rules = rulesByMatch[m.Id];
                var goals = m.Goals.ToList();
                var cards = m.Cards.ToList();
                var scorerPicks = p.GoalscorerPredictions.ToList();
                var cardPicks = p.CardPredictions.ToList();

                var scorerAwards = ScoringEngine.AwardScorerPoints(
                    rules, scorerPicks.Select(g => (g.PlayerId, g.GoalType, g.Player.Position)), goals);
                var cardAwards = ScoringEngine.AwardCardPoints(
                    rules, cardPicks.Select(c => (c.PlayerId, c.Kind)), goals, cards);

                var scorers = scorerPicks
                    .Select((g, idx) => new ScorerPickDto(g.PlayerId, g.Player.Name, g.Player.Position.ToString(), g.GoalType, g.Player.TeamId, scorerAwards[idx]))
                    .ToList();
                var cardDtos = cardPicks
                    .Select((c, idx) => new CardPickDto(c.PlayerId, c.Player.Name, c.Kind.ToString(), c.Player.TeamId, cardAwards[idx]))
                    .ToList();

                int? finalPoints = p.Score?.TotalPoints;
                int projected;
                if (finalPoints.HasValue)
                    projected = finalPoints.Value;
                else if (m.HomeGoals.HasValue && m.AwayGoals.HasValue)
                    projected = ScoringEngine.Calculate(
                        rules, p.HomeGoals, p.AwayGoals, m.HomeGoals.Value, m.AwayGoals.Value,
                        scorerPicks.Select(g => (g.PlayerId, g.GoalType, g.Player.Position)),
                        cardPicks.Select(c => (c.PlayerId, c.Kind)),
                        goals, cards,
                        p.FinishType, m.IsKnockout ? m.FinishType : null).Total;
                else
                    projected = 0;

                return new MyPredictionItemDto(
                    m.Id, m.Round, m.KickoffUtc, m.Status,
                    new TeamSummaryDto(m.HomeTeam.Id, m.HomeTeam.Name, m.HomeTeam.Code, m.HomeTeam.LogoUrl),
                    new TeamSummaryDto(m.AwayTeam.Id, m.AwayTeam.Name, m.AwayTeam.Code, m.AwayTeam.LogoUrl),
                    m.HomeGoals, m.AwayGoals,
                    p.HomeGoals, p.AwayGoals,
                    scorers, cardDtos,
                    finalPoints,
                    projected,
                    finalPoints.HasValue);
            })
            .ToList();
    }
}
