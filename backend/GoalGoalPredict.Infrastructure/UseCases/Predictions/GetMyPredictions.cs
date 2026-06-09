using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetMyPredictions(AppDbContext db, EffectiveRulesService effectiveRules)
{
    public async Task<List<MyPredictionItemDto>> ExecuteAsync(Guid userId, Guid groupId, bool onlyStarted = false, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var predictions = await db.Predictions
            .Include(p => p.Match).ThenInclude(m => m.HomeTeam)
            .Include(p => p.Match).ThenInclude(m => m.AwayTeam)
            .Include(p => p.Match).ThenInclude(m => m.Goals)
            .Include(p => p.Match).ThenInclude(m => m.Cards)
            .Include(p => p.GoalscorerPredictions).ThenInclude(g => g.Player)
            .Include(p => p.CardPredictions).ThenInclude(c => c.Player)
            .Include(p => p.Score)
            .Where(p => p.UserId == userId && p.GroupId == groupId)
            // When viewing another member, hide picks for matches that haven't kicked off.
            .Where(p => !onlyStarted || p.Match.KickoffUtc <= now)
            .ToListAsync(ct);

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
                    .Select((g, idx) => new ScorerPickDto(g.PlayerId, g.Player.Name, g.Player.Position.ToString(), g.GoalType, scorerAwards[idx]))
                    .ToList();
                var cardDtos = cardPicks
                    .Select((c, idx) => new CardPickDto(c.PlayerId, c.Player.Name, c.Kind.ToString(), cardAwards[idx]))
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
                        goals, cards).Total;
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
