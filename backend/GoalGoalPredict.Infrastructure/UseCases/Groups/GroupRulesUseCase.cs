using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Groups;

public class GroupRulesUseCase(AppDbContext db, IGroupRulesCache cache)
{
    public async Task<GroupScoringRulesDto?> GetAsync(Guid groupId, Guid userId, CancellationToken ct = default)
    {
        var group = await db.Groups.FindAsync([groupId], ct);
        if (group is null) return null;

        var isAdmin = await IsAdminAsync(userId, ct);
        var isMember = await db.GroupMembers.AnyAsync(m => m.GroupId == groupId && m.UserId == userId, ct);
        if (!isMember && !isAdmin) return null;

        // The rule values are per-group → cached. CanEdit is per-user, so it's stamped here, not cached.
        var dto = await cache.GetOrAddAsync(groupId, async () => ToDto(await GetOrCreateAsync(groupId, ct), canEdit: false));
        var canEdit = group.CreatedByUserId == userId || isAdmin;

        return dto with { CanEdit = canEdit };
    }

    public async Task<(GroupScoringRulesDto? Result, string? Error)> UpdateAsync(
        Guid groupId, Guid userId, UpdateGroupRulesRequest req, CancellationToken ct = default)
    {
        var group = await db.Groups.FindAsync([groupId], ct);
        if (group is null) return (null, "Group not found");

        var isAdmin = await IsAdminAsync(userId, ct);
        if (group.CreatedByUserId != userId && !isAdmin)
            return (null, "Only the group owner can edit scoring rules");

        // Owners may edit any time; edits only affect matches that haven't kicked off yet
        // (started matches keep the rules snapshot frozen at their kickoff).
        if (!Enum.TryParse<CardPredictionMode>(req.CardPredictionMode, out var mode))
            return (null, $"Invalid card prediction mode '{req.CardPredictionMode}'");

        var rules = await GetOrCreateAsync(groupId, ct);
        rules.Update(
            req.ExactScoreEnabled, req.ExactScorePoints,
            req.OutcomeEnabled, req.OutcomePoints,
            req.GoalscorerEnabled, req.ScorerGkPoints, req.ScorerDefPoints, req.ScorerMidPoints, req.ScorerAttPoints,
            req.OwnGoalEnabled, req.OwnGoalPoints,
            req.YellowCardEnabled, req.YellowCardPoints, req.YellowCardMaxPicks,
            req.RedCardEnabled, req.RedCardPoints, req.RedCardMaxPicks,
            req.MissedPenaltyEnabled, req.MissedPenaltyPoints, req.MissedPenaltyMaxPicks,
            mode, req.WrongPickPenalty);

        await db.SaveChangesAsync(ct);

        // Rules changed → drop the cached rules for this group (evict after commit).
        cache.Invalidate(groupId);
        return (ToDto(rules, canEdit: true), null);
    }

    private async Task<bool> IsAdminAsync(Guid userId, CancellationToken ct) =>
        await db.Users.Where(u => u.Id == userId).Select(u => u.IsAdmin).FirstOrDefaultAsync(ct);

    // The live, owner-editable rules row for the group (MatchId == null).
    private async Task<GroupScoringRules> GetOrCreateAsync(Guid groupId, CancellationToken ct)
    {
        var rules = await db.GroupScoringRules.FirstOrDefaultAsync(r => r.GroupId == groupId && r.MatchId == null, ct);
        if (rules is null)
        {
            rules = GroupScoringRules.CreateDefault(groupId);
            db.GroupScoringRules.Add(rules);
            await db.SaveChangesAsync(ct);
        }
        return rules;
    }

    private static GroupScoringRulesDto ToDto(GroupScoringRules r, bool canEdit) => new(
        r.ExactScoreEnabled, r.ExactScorePoints,
        r.OutcomeEnabled, r.OutcomePoints,
        r.GoalscorerEnabled, r.ScorerGkPoints, r.ScorerDefPoints, r.ScorerMidPoints, r.ScorerAttPoints,
        r.OwnGoalEnabled, r.OwnGoalPoints,
        r.YellowCardEnabled, r.YellowCardPoints, r.YellowCardMaxPicks,
        r.RedCardEnabled, r.RedCardPoints, r.RedCardMaxPicks,
        r.MissedPenaltyEnabled, r.MissedPenaltyPoints, r.MissedPenaltyMaxPicks,
        r.CardPredictionMode.ToString(), r.WrongPickPenalty,
        false, canEdit);
}
