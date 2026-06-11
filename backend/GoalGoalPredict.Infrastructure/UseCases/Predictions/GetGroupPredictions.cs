using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class GetGroupPredictions(AppDbContext db, EffectiveRulesService effectiveRules)
{
    public async Task<GroupPredictionsDto?> ExecuteAsync(int matchId, Guid groupId, CancellationToken ct = default)
    {
        var match = await db.Matches
            .Include(m => m.Goals)
            .Include(m => m.Cards)
            .FirstOrDefaultAsync(m => m.Id == matchId, ct);
        if (match is null) return null;
        if (match.KickoffUtc > DateTime.UtcNow) return null;

        var rules = await effectiveRules.GetForMatchAsync(groupId, match, createIfMissing: false, ct);

        var predictions = await db.Predictions
            .Include(p => p.User)
            .Include(p => p.GoalscorerPredictions).ThenInclude(g => g.Player)
            .Include(p => p.CardPredictions).ThenInclude(c => c.Player)
            .Include(p => p.Score)
            .Where(p => p.MatchId == matchId && p.GroupId == groupId)
            .ToListAsync(ct);

        var goals = match.Goals.ToList();
        var cards = match.Cards.ToList();
        var hasResult = match.HomeGoals.HasValue && match.AwayGoals.HasValue;

        var members = predictions.Select(p =>
        {
            var scorerPicks = p.GoalscorerPredictions.ToList();
            var cardPicks = p.CardPredictions.ToList();

            var scorerAwards = ScoringEngine.AwardScorerPoints(
                rules, scorerPicks.Select(g => (g.PlayerId, g.GoalType, g.Player.Position)), goals);
            var cardAwards = ScoringEngine.AwardCardPoints(
                rules, cardPicks.Select(c => (c.PlayerId, c.Kind)), goals, cards);

            var scorerDtos = scorerPicks
                .Select((g, idx) => new ScorerPickDto(g.PlayerId, g.Player.Name, g.Player.Position.ToString(), g.GoalType, g.Player.TeamId, scorerAwards[idx]))
                .ToList();
            var cardDtos = cardPicks
                .Select((c, idx) => new CardPickDto(c.PlayerId, c.Player.Name, c.Kind.ToString(), c.Player.TeamId, cardAwards[idx]))
                .ToList();

            int projected;
            if (p.Score is not null)
                projected = p.Score.TotalPoints;
            else if (hasResult)
                projected = ScoringEngine.Calculate(
                    rules, p.HomeGoals, p.AwayGoals, match.HomeGoals!.Value, match.AwayGoals!.Value,
                    scorerPicks.Select(g => (g.PlayerId, g.GoalType, g.Player.Position)),
                    cardPicks.Select(c => (c.PlayerId, c.Kind)),
                    goals, cards).Total;
            else
                projected = 0;

            return new MemberPredictionDto(
                p.UserId, p.User.FirstName, p.User.LastName,
                p.HomeGoals, p.AwayGoals,
                scorerDtos, cardDtos,
                projected);
        }).OrderByDescending(m => m.ProjectedPoints).ToList();

        return new GroupPredictionsDto(matchId, match.Status, match.HomeGoals, match.AwayGoals, members);
    }
}
