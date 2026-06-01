using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Matches;

public class SyncFixtures(AppDbContext db, IApiFootballClient api, ILogger<SyncFixtures> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        logger.LogInformation("Syncing fixtures...");
        var fixtures = await api.GetFixturesAsync(ct);

        foreach (var f in fixtures)
        {
            var existing = await db.Matches.FindAsync([f.Id], ct);
            if (existing is null)
            {
                db.Matches.Add(Match.FromApi(
                    f.Id, f.HomeTeamId, f.AwayTeamId, f.KickoffUtc,
                    f.Status, f.ElapsedMinutes,
                    f.HomeGoals, f.AwayGoals,
                    f.EtHomeGoals, f.EtAwayGoals,
                    f.PenHomeGoals, f.PenAwayGoals,
                    f.Round));
            }
            else if (!existing.IsFinished)
            {
                existing.UpdateFromApi(
                    f.Status, f.ElapsedMinutes,
                    f.HomeGoals, f.AwayGoals,
                    f.EtHomeGoals, f.EtAwayGoals,
                    f.PenHomeGoals, f.PenAwayGoals);
            }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Synced {Count} fixtures", fixtures.Count);
    }
}
