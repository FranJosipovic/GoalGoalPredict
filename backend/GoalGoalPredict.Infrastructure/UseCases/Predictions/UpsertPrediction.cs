using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.UseCases.Predictions;

public class UpsertPrediction(AppDbContext db, EffectiveRulesService effectiveRules)
{
    private static readonly string[] ValidGoalTypes = ["Normal Goal", "Penalty", "Own Goal"];
    private static readonly string[] ValidFinishTypes = ["Regular", "ExtraTime", "Penalties"];

    public async Task<(PredictionResultDto? Result, string? Error)> ExecuteAsync(
        Guid userId, UpsertPredictionRequest request, CancellationToken ct = default)
    {
        var match = await db.Matches.FindAsync([request.MatchId], ct);
        if (match is null) return (null, "Match not found");
        if (match.KickoffUtc <= DateTime.UtcNow) return (null, "Predictions are locked — match has started");

        var group = await db.Groups.FindAsync([request.GroupId], ct);
        if (group is null) return (null, "Group not found");
        if (group.IsGlobal && group.IsLocked)
            return (null, "The global competition opens when the knockout phase begins");

        var isMember = await db.GroupMembers.AnyAsync(m => m.GroupId == request.GroupId && m.UserId == userId, ct);
        if (!isMember)
        {
            // Everyone implicitly belongs to the global group — materialise the membership row
            // on first prediction so the leaderboard/members include them.
            if (!group.IsGlobal) return (null, "Not a member of this group");
            db.GroupMembers.Add(new GroupMember(group.Id, userId, GroupRole.Member));
        }

        var rules = await effectiveRules.GetLiveAsync(request.GroupId, ct);

        // --- Validate knockout finish-type pick ---
        // Group-stage matches must not carry a finish type; knockout matches may (when enabled).
        var finishType = string.IsNullOrEmpty(request.FinishType) ? null : request.FinishType;
        if (finishType is not null)
        {
            if (!match.IsKnockout)
                return (null, "Finish type only applies to knockout matches");
            if (!ValidFinishTypes.Contains(finishType))
                return (null, $"Invalid finish type '{finishType}'");
            if (!rules.FinishTypeEnabled)
                return (null, "Finish-type predictions are disabled for this group");
        }

        var scorers = request.Scorers ?? [];
        var cards = request.Cards ?? [];

        // --- Validate scorer picks ---
        foreach (var s in scorers)
        {
            if (!ValidGoalTypes.Contains(s.GoalType))
                return (null, $"Invalid goal type '{s.GoalType}'");
            if (s.GoalType == "Own Goal" && !rules.OwnGoalEnabled)
                return (null, "Own goal predictions are disabled for this group");
            if (s.GoalType != "Own Goal" && !rules.GoalscorerEnabled)
                return (null, "Goalscorer predictions are disabled for this group");
        }

        // --- Validate card picks ---
        var parsedCards = new List<(int PlayerId, CardKind Kind)>();
        foreach (var c in cards)
        {
            if (!Enum.TryParse<CardKind>(c.Kind, out var kind))
                return (null, $"Invalid card kind '{c.Kind}'");
            if (!rules.EnabledFor(kind))
                return (null, $"{kind} predictions are disabled for this group");
            parsedCards.Add((c.PlayerId, kind));
        }
        foreach (var grp in parsedCards.GroupBy(c => c.Kind))
        {
            var max = rules.MaxPicksFor(grp.Key);
            if (grp.Count() > max)
                return (null, $"Too many {grp.Key} picks (max {max})");
        }

        var existing = await db.Predictions
            .FirstOrDefaultAsync(p => p.UserId == userId && p.MatchId == request.MatchId && p.GroupId == request.GroupId, ct);

        Guid predictionId;
        if (existing is null)
        {
            var prediction = Prediction.Create(userId, request.MatchId, request.GroupId, request.HomeGoals, request.AwayGoals, finishType);
            db.Predictions.Add(prediction);
            predictionId = prediction.Id;
        }
        else
        {
            existing.Update(request.HomeGoals, request.AwayGoals, finishType);
            predictionId = existing.Id;
            var oldScorers = await db.GoalscorerPredictions.Where(g => g.PredictionId == predictionId).ToListAsync(ct);
            db.GoalscorerPredictions.RemoveRange(oldScorers);
            var oldCards = await db.CardPredictions.Where(c => c.PredictionId == predictionId).ToListAsync(ct);
            db.CardPredictions.RemoveRange(oldCards);
        }

        // Allow duplicate (player, goalType) pairs (same player can score multiple goals of a type).
        db.GoalscorerPredictions.AddRange(scorers.Select(s => GoalscorerPrediction.Create(predictionId, s.PlayerId, s.GoalType)));
        db.CardPredictions.AddRange(parsedCards.Select(c => CardPrediction.Create(predictionId, c.PlayerId, c.Kind)));

        await db.SaveChangesAsync(ct);

        return (new PredictionResultDto(predictionId, request.MatchId, request.GroupId,
            request.HomeGoals, request.AwayGoals,
            scorers.ToList(),
            parsedCards.Select(c => new CardPickInput(c.PlayerId, c.Kind.ToString())).ToList(),
            DateTime.UtcNow, finishType), null);
    }
}
