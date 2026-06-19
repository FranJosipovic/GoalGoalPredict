using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Domain.Services;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Admin;

// Re-scores a played match from the events currently stored in the DB, respecting each
// group's frozen scoring rules. CompareAsync is a dry run (diff only); ApplyAsync persists.
// Used to fix scores after event data was corrected (VAR, late goals, etc.).
public class SyncMatchScoring(AppDbContext db, EffectiveRulesService effectiveRules, ILeaderboardCache leaderboardCache)
{
    public record CategoryDiff(string Category, int Current, int New);
    public record ScoreDiff(
        Guid PredictionId, string User, string Group,
        int? CurrentTotal, int NewTotal, bool Changed, List<CategoryDiff> Categories);
    public record ScoringResult(
        int MatchId, string Match, bool Applied, int Predictions, int Changed, List<ScoreDiff> Diffs);

    public Task<ScoringResult> CompareAsync(int matchId, CancellationToken ct = default) => RunAsync(matchId, apply: false, ct);
    public Task<ScoringResult> ApplyAsync(int matchId, CancellationToken ct = default) => RunAsync(matchId, apply: true, ct);

    private async Task<ScoringResult> RunAsync(int matchId, bool apply, CancellationToken ct)
    {
        var match = await db.Matches.Include(m => m.HomeTeam).Include(m => m.AwayTeam)
            .FirstOrDefaultAsync(m => m.Id == matchId, ct)
            ?? throw new InvalidOperationException($"Match {matchId} not found.");
        if (!match.HomeGoals.HasValue || !match.AwayGoals.HasValue)
            throw new InvalidOperationException("Match has no final score yet — nothing to score.");

        var goals = await db.MatchGoals.Where(g => g.MatchId == matchId).ToListAsync(ct);
        var cards = await db.MatchCards.Where(c => c.MatchId == matchId).ToListAsync(ct);

        var predictions = await db.Predictions
            .Include(p => p.GoalscorerPredictions).ThenInclude(g => g.Player)
            .Include(p => p.CardPredictions)
            .AsSplitQuery()
            .Where(p => p.MatchId == matchId)
            .ToListAsync(ct);

        var existingScores = await db.PredictionScores
            .Where(s => s.MatchId == matchId)
            .ToDictionaryAsync(s => s.PredictionId, ct);

        var groupIds = predictions.Select(p => p.GroupId).Distinct().ToList();
        var userIds = predictions.Select(p => p.UserId).Distinct().ToList();
        var groupNames = await db.Groups.Where(g => groupIds.Contains(g.Id)).ToDictionaryAsync(g => g.Id, g => g.Name, ct);
        var userNames = await db.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}", ct);

        // Per-group rules: live rules for an unstarted match, else the frozen kickoff snapshot.
        // Only create snapshots when applying (compare must not mutate).
        var rulesByGroup = new Dictionary<Guid, GroupScoringRules>();
        foreach (var gid in groupIds)
            rulesByGroup[gid] = await effectiveRules.GetForMatchAsync(gid, match, createIfMissing: apply, ct);

        var diffs = new List<ScoreDiff>();
        var changed = 0;
        foreach (var p in predictions)
        {
            var rules = rulesByGroup[p.GroupId];
            var bd = ScoringEngine.Calculate(
                rules,
                p.HomeGoals, p.AwayGoals,
                match.HomeGoals!.Value, match.AwayGoals!.Value,
                p.GoalscorerPredictions.Select(g => (g.PlayerId, g.GoalType, g.Player.Position)),
                p.CardPredictions.Select(c => (c.PlayerId, c.Kind)),
                goals, cards);

            existingScores.TryGetValue(p.Id, out var cur);
            var cats = BuildCategories(cur, bd);
            var isChanged = cur is null || cur.TotalPoints != bd.Total || cats.Any(c => c.Current != c.New);
            if (isChanged) changed++;

            diffs.Add(new ScoreDiff(
                p.Id,
                userNames.GetValueOrDefault(p.UserId, "?"),
                groupNames.GetValueOrDefault(p.GroupId, "?"),
                cur?.TotalPoints, bd.Total, isChanged, cats));

            if (apply)
            {
                if (cur is null)
                    db.PredictionScores.Add(PredictionScore.Create(p.Id, p.UserId, p.MatchId, p.GroupId, bd));
                else
                    cur.Recalculate(bd);
                p.MarkScored();
            }
        }

        if (apply)
        {
            if (!match.IsFinished) match.SetFinished();
            await db.SaveChangesAsync(ct);
            // Re-scored these groups → drop their cached leaderboards (evict after commit).
            leaderboardCache.Invalidate(groupIds);
        }

        var ordered = diffs
            .OrderByDescending(d => d.Changed).ThenBy(d => d.Group).ThenBy(d => d.User)
            .ToList();
        return new ScoringResult(matchId, $"{match.HomeTeam.Name} vs {match.AwayTeam.Name}",
            apply, predictions.Count, changed, ordered);
    }

    // Only categories with a non-zero current or new value, so the diff stays compact.
    private static List<CategoryDiff> BuildCategories(PredictionScore? cur, ScoreBreakdown b) =>
        new List<CategoryDiff>
        {
            new("Exact", cur?.ExactScorePoints ?? 0, b.Exact),
            new("Outcome", cur?.OutcomePoints ?? 0, b.Outcome),
            new("Goalscorer", cur?.GoalscorerPoints ?? 0, b.Goalscorer),
            new("Own goal", cur?.OwnGoalPoints ?? 0, b.OwnGoal),
            new("Yellow", cur?.YellowCardPoints ?? 0, b.Yellow),
            new("Red", cur?.RedCardPoints ?? 0, b.Red),
            new("Missed pen", cur?.MissedPenaltyPoints ?? 0, b.MissedPenalty),
        }
        .Where(c => c.Current != 0 || c.New != 0)
        .ToList();
}
