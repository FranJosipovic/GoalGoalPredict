using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

/// <summary>
/// After a user predicts a match in one group, lets them mirror those picks into their other
/// groups. Targets are the user's other (predictable) groups for this match; the copy filters
/// each pick against the destination group's own rules so a group with goalscorers/cards/finish
/// disabled silently drops what it doesn't allow instead of failing.
/// </summary>
public class CopyPredictionToGroups(AppDbContext db, EffectiveRulesService effectiveRules, UpsertPrediction upsert)
{
    // The user's other groups this match can still be copied into, flagged with whether they
    // already have a prediction there (so the UI can default-select the empty ones).
    public async Task<List<CopyTargetDto>> GetTargetsAsync(Guid userId, int matchId, Guid sourceGroupId, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([matchId], ct);
        if (match is null || match.KickoffUtc <= DateTime.UtcNow) return [];

        var memberGroupIds = await db.GroupMembers
            .Where(m => m.UserId == userId && m.GroupId != sourceGroupId)
            .Select(m => m.GroupId)
            .ToListAsync(ct);

        var groups = await db.Groups
            .Where(g => memberGroupIds.Contains(g.Id))
            // The locked global group doesn't accept predictions yet.
            .Where(g => !(g.IsGlobal && g.IsLocked))
            .ToListAsync(ct);

        var predictedGroupIds = await db.Predictions
            .Where(p => p.UserId == userId && p.MatchId == matchId)
            .Select(p => p.GroupId)
            .ToListAsync(ct);
        var predicted = predictedGroupIds.ToHashSet();

        return groups
            .Select(g => new CopyTargetDto(g.Id, g.Name, predicted.Contains(g.Id)))
            .ToList();
    }

    public async Task<CopyToGroupsResultDto> ExecuteAsync(Guid userId, CopyToGroupsRequest request, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([request.MatchId], ct);
        if (match is null || match.KickoffUtc <= DateTime.UtcNow)
            return new CopyToGroupsResultDto(0, request.TargetGroupIds.Count);

        var source = await db.Predictions
            .Include(p => p.GoalscorerPredictions)
            .Include(p => p.CardPredictions)
            .AsSplitQuery()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.MatchId == request.MatchId && p.GroupId == request.SourceGroupId, ct);
        if (source is null) return new CopyToGroupsResultDto(0, request.TargetGroupIds.Count);

        int copied = 0, failed = 0;
        foreach (var targetGroupId in request.TargetGroupIds.Distinct())
        {
            if (targetGroupId == request.SourceGroupId) continue;

            var rules = await effectiveRules.GetLiveAsync(targetGroupId, ct);

            // Keep only picks the destination group's rules allow.
            var scorers = source.GoalscorerPredictions
                .Where(g => g.GoalType == "Own Goal" ? rules.OwnGoalEnabled : rules.GoalscorerEnabled)
                .Select(g => new ScorerPickInput(g.PlayerId, g.GoalType))
                .ToList();

            var cards = source.CardPredictions
                .Where(c => rules.EnabledFor(c.Kind))
                .GroupBy(c => c.Kind)
                .SelectMany(grp => grp.Take(rules.MaxPicksFor(grp.Key)))
                .Select(c => new CardPickInput(c.PlayerId, c.Kind.ToString()))
                .ToList();

            var finishType = match.IsKnockout && rules.FinishTypeEnabled ? source.FinishType : null;

            var req = new UpsertPredictionRequest(
                request.MatchId, targetGroupId, source.HomeGoals, source.AwayGoals, scorers, cards, finishType);
            var (result, _) = await upsert.ExecuteAsync(userId, req, ct);
            if (result is not null) copied++; else failed++;
        }

        return new CopyToGroupsResultDto(copied, failed);
    }
}
