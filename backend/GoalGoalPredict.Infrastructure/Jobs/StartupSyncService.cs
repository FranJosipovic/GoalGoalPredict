using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.UseCases.Matches;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.Jobs;

public class StartupSyncService(IServiceScopeFactory scopeFactory, ILogger<StartupSyncService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken ct)
    {
        // Must never throw: a failed startup sync (e.g. API-Football hiccup) must not
        // take the whole site down. The recurring scheduler will retry afterwards.
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teamsExist = await db.Teams.AnyAsync(ct);
            if (!teamsExist)
            {
                logger.LogInformation("No teams found — running initial sync...");
                var syncTeams = scope.ServiceProvider.GetRequiredService<SyncTeamsAndPlayers>();
                await syncTeams.ExecuteAsync(ct);
            }

            var lastSync = await db.Matches
                .OrderByDescending(m => m.LastSyncedAt)
                .Select(m => m.LastSyncedAt)
                .FirstOrDefaultAsync(ct);

            if (lastSync == default || DateTime.UtcNow - lastSync > TimeSpan.FromHours(1))
            {
                logger.LogInformation("Fixtures stale — syncing...");
                var syncFixtures = scope.ServiceProvider.GetRequiredService<SyncFixtures>();
                await syncFixtures.ExecuteAsync(ct);
            }
            else
            {
                logger.LogInformation("Fixtures up to date (last sync: {LastSync:u})", lastSync);
            }

            // Standings + top scorers are cheap (one API call each) — refresh every startup.
            var syncStandings = scope.ServiceProvider.GetRequiredService<UseCases.Tournament.SyncStandings>();
            await syncStandings.ExecuteAsync(ct);

            var syncTopScorers = scope.ServiceProvider.GetRequiredService<UseCases.Tournament.SyncTopScorers>();
            await syncTopScorers.ExecuteAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Startup sync failed — continuing; scheduler will retry");
        }
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
