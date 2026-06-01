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
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
