using System.Text.RegularExpressions;
using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Guest;

// Default scoring rules used for all landing-page guest predictions (not tied to any group).
public static class GuestScoringDefaults
{
    public static GroupScoringRules Rules() => GroupScoringRules.CreateDefault(Guid.Empty);

    public static GroupScoringRulesDto ToDto(GroupScoringRules r) => new(
        r.ExactScoreEnabled, r.ExactScorePoints,
        r.OutcomeEnabled, r.OutcomePoints,
        r.GoalscorerEnabled, r.ScorerGkPoints, r.ScorerDefPoints, r.ScorerMidPoints, r.ScorerAttPoints,
        r.OwnGoalEnabled, r.OwnGoalPoints,
        r.YellowCardEnabled, r.YellowCardPoints, r.YellowCardMaxPicks,
        r.RedCardEnabled, r.RedCardPoints, r.RedCardMaxPicks,
        r.MissedPenaltyEnabled, r.MissedPenaltyPoints, r.MissedPenaltyMaxPicks,
        r.CardPredictionMode.ToString(), r.WrongPickPenalty,
        IsLocked: true, CanEdit: false);
}

public class GuestPredictions(AppDbContext db)
{
    private static readonly string[] ValidGoalTypes = ["Normal Goal", "Penalty", "Own Goal"];
    private static readonly Regex EmailRe = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    public async Task<GuestNextMatchDto?> GetNextMatchAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var match = await db.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.Source == "ApiFootball" && m.Status == "NS" && m.KickoffUtc > now)
            .OrderBy(m => m.KickoffUtc)
            .FirstOrDefaultAsync(ct);

        if (match is null) return null;

        var players = await db.Players
            .Where(p => (p.TeamId == match.HomeTeamId || p.TeamId == match.AwayTeamId) && p.IsActive)
            .OrderBy(p => p.Position).ThenBy(p => p.ShirtNumber)
            .Select(p => new { p.Id, p.Name, p.ShirtNumber, Position = p.Position.ToString(), p.PhotoUrl, p.TeamId })
            .ToListAsync(ct);

        List<GuestPlayerDto> ForTeam(int teamId) => players
            .Where(p => p.TeamId == teamId)
            .Select(p => new GuestPlayerDto(p.Id, p.Name, p.ShirtNumber, p.Position, p.PhotoUrl))
            .ToList();

        var matchDto = new GuestMatchDto(
            match.Id, match.KickoffUtc.ToString("o"), match.Status, match.Round,
            new TeamSummaryDto(match.HomeTeam.Id, match.HomeTeam.Name, match.HomeTeam.Code, match.HomeTeam.LogoUrl),
            new TeamSummaryDto(match.AwayTeam.Id, match.AwayTeam.Name, match.AwayTeam.Code, match.AwayTeam.LogoUrl));

        return new GuestNextMatchDto(
            matchDto, GuestScoringDefaults.ToDto(GuestScoringDefaults.Rules()),
            ForTeam(match.HomeTeamId), ForTeam(match.AwayTeamId));
    }

    public async Task<(bool Ok, string? Error)> SubmitAsync(GuestPredictRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !EmailRe.IsMatch(req.Email.Trim()))
            return (false, "Please enter a valid email.");
        if (req.HomeGoals is < 0 or > 30 || req.AwayGoals is < 0 or > 30)
            return (false, "Score out of range.");

        var match = await db.Matches.FindAsync([req.MatchId], ct);
        if (match is null) return (false, "Match not found.");
        if (match.KickoffUtc <= DateTime.UtcNow) return (false, "This match has already started.");

        var rules = GuestScoringDefaults.Rules();
        var scorers = req.Scorers ?? [];
        var cards = req.Cards ?? [];

        foreach (var s in scorers)
            if (!ValidGoalTypes.Contains(s.GoalType))
                return (false, $"Invalid goal type '{s.GoalType}'.");

        var parsedCards = new List<(int PlayerId, CardKind Kind)>();
        foreach (var c in cards)
        {
            if (!Enum.TryParse<CardKind>(c.Kind, out var kind))
                return (false, $"Invalid card kind '{c.Kind}'.");
            parsedCards.Add((c.PlayerId, kind));
        }
        foreach (var grp in parsedCards.GroupBy(c => c.Kind))
            if (grp.Count() > rules.MaxPicksFor(grp.Key))
                return (false, $"Too many {grp.Key} picks (max {rules.MaxPicksFor(grp.Key)}).");

        var email = req.Email.Trim().ToLowerInvariant();
        var existing = await db.GuestPredictions
            .Include(g => g.Scorers).Include(g => g.Cards)
            .FirstOrDefaultAsync(g => g.Email == email && g.MatchId == req.MatchId, ct);

        if (existing is null)
        {
            var pred = GuestPrediction.Create(email, req.MatchId, req.HomeGoals, req.AwayGoals);
            foreach (var s in scorers) pred.Scorers.Add(GuestGoalscorerPrediction.Create(pred.Id, s.PlayerId, s.GoalType));
            foreach (var c in parsedCards) pred.Cards.Add(GuestCardPrediction.Create(pred.Id, c.PlayerId, c.Kind));
            db.GuestPredictions.Add(pred);
        }
        else
        {
            existing.Update(req.HomeGoals, req.AwayGoals);
            db.GuestGoalscorerPredictions.RemoveRange(existing.Scorers);
            db.GuestCardPredictions.RemoveRange(existing.Cards);
            foreach (var s in scorers) db.GuestGoalscorerPredictions.Add(GuestGoalscorerPrediction.Create(existing.Id, s.PlayerId, s.GoalType));
            foreach (var c in parsedCards) db.GuestCardPredictions.Add(GuestCardPrediction.Create(existing.Id, c.PlayerId, c.Kind));
        }

        await db.SaveChangesAsync(ct);
        return (true, null);
    }

    public async Task<GuestPredictionAdminList> GetAdminListAsync(CancellationToken ct = default)
    {
        var rows = await db.GuestPredictions
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new
            {
                g.Id, g.Email, g.MatchId, g.HomeGoals, g.AwayGoals,
                ScorerCount = g.Scorers.Count, CardCount = g.Cards.Count,
                g.IsScored, g.TotalPoints, g.Notified, g.CreatedAt
            })
            .ToListAsync(ct);

        var matchIds = rows.Select(r => r.MatchId).Distinct().ToList();
        var matches = await db.Matches
            .Where(m => matchIds.Contains(m.Id))
            .Include(m => m.HomeTeam).Include(m => m.AwayTeam)
            .ToDictionaryAsync(m => m.Id, m => new { Home = m.HomeTeam.Name, Away = m.AwayTeam.Name }, ct);

        var items = rows.Select(r =>
        {
            matches.TryGetValue(r.MatchId, out var m);
            return new GuestPredictionAdminItem(
                r.Id, r.Email, r.MatchId, m?.Home ?? "?", m?.Away ?? "?",
                r.HomeGoals, r.AwayGoals, r.ScorerCount, r.CardCount,
                r.IsScored, r.IsScored ? r.TotalPoints : null, r.Notified, r.CreatedAt.ToString("o"));
        }).ToList();

        var summary = new GuestPredictionAdminSummary(
            rows.Count,
            rows.Select(r => r.Email).Distinct().Count(),
            rows.Count(r => r.IsScored),
            rows.Count(r => !r.IsScored));

        return new GuestPredictionAdminList(summary, items);
    }
}
