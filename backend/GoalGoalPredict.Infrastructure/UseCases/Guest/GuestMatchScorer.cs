using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Guest;

// Scores landing-page guest predictions for a finished match (default rules) and emails each
// guest their result. Best-effort: an email failure never blocks the scoring/save.
public class GuestMatchScorer(AppDbContext db, IEmailSender email, ILogger<GuestMatchScorer> logger)
{
    public async Task ExecuteAsync(int matchId, CancellationToken ct = default)
    {
        var match = await db.Matches
            .Include(m => m.HomeTeam).Include(m => m.AwayTeam)
            .FirstOrDefaultAsync(m => m.Id == matchId, ct);
        if (match is null || !match.HomeGoals.HasValue || !match.AwayGoals.HasValue) return;

        var predictions = await db.GuestPredictions
            .Include(g => g.Scorers).Include(g => g.Cards)
            .Where(g => g.MatchId == matchId && !g.IsScored)
            .ToListAsync(ct);
        if (predictions.Count == 0) return;

        var goals = await db.MatchGoals.Where(g => g.MatchId == matchId).ToListAsync(ct);
        var cards = await db.MatchCards.Where(c => c.MatchId == matchId).ToListAsync(ct);

        // Positions for the picked players (used to value goalscorer picks).
        var pickedIds = predictions.SelectMany(p => p.Scorers.Select(s => s.PlayerId)).Distinct().ToList();
        var positions = await db.Players
            .Where(p => pickedIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Position, ct);
        PlayerPosition PosOf(int id) => positions.TryGetValue(id, out var p) ? p : PlayerPosition.Midfielder;

        var rules = GuestScoringDefaults.Rules();
        var notify = new List<(GuestPrediction Pred, int Points)>();

        foreach (var pred in predictions)
        {
            var breakdown = ScoringEngine.Calculate(
                rules,
                pred.HomeGoals, pred.AwayGoals,
                match.HomeGoals.Value, match.AwayGoals.Value,
                pred.Scorers.Select(s => (s.PlayerId, s.GoalType, PosOf(s.PlayerId))),
                pred.Cards.Select(c => (c.PlayerId, c.Kind)),
                goals, cards);

            pred.MarkScored(breakdown.Total);
            notify.Add((pred, breakdown.Total));
        }

        await db.SaveChangesAsync(ct);

        var title = $"{match.HomeTeam.Name} vs {match.AwayTeam.Name}";
        var final = $"{match.HomeGoals}–{match.AwayGoals}";
        foreach (var (pred, points) in notify)
        {
            try
            {
                await email.SendGuestResultEmailAsync(pred.Email, title, $"{pred.HomeGoals}–{pred.AwayGoals}", final, points);
                pred.MarkNotified();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to email guest result to {Email} for match {MatchId}", pred.Email, matchId);
            }
        }
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Scored {Count} guest prediction(s) for match {MatchId}", predictions.Count, matchId);
    }
}
