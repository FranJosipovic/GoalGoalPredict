using System.Collections.Concurrent;
using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.UseCases.Players;

// Returns a player's season statistics, cached in the DB to protect the API quota:
//  • Freshness: re-fetch only once the player's team has played since the last sync.
//  • Negative caching: a row is written even when the API has no record yet, so
//    repeated clicks on a stat-less player don't keep hitting the API.
//  • Cooldown: a hard floor (6h) between API attempts per player, so even a
//    "stale" player can't be used to spam the API.
//  • Coalescing: concurrent clicks on the same player collapse into one API call.
public class GetPlayerStatistics(AppDbContext db, IApiFootballClient api, ILogger<GetPlayerStatistics> logger)
{
    private static readonly string[] FinishedStatuses = ["FT", "AET", "PEN"];
    private static readonly TimeSpan Cooldown = TimeSpan.FromHours(6);
    // If the latest match was this long ago and the player's numbers still haven't moved,
    // assume they simply didn't feature and stop retrying (caps quota for benched players).
    private static readonly TimeSpan GraceAfterMatch = TimeSpan.FromHours(18);

    // Per-player gate so simultaneous requests don't each fire an API call.
    private static readonly ConcurrentDictionary<int, SemaphoreSlim> Locks = new();

    public async Task<PlayerStatsDto?> ExecuteAsync(int playerId, CancellationToken ct = default)
    {
        var player = await db.Players
            .Include(p => p.Team)
            .FirstOrDefaultAsync(p => p.Id == playerId, ct);
        if (player is null) return null;

        var stats = await db.PlayerStatistics.FirstOrDefaultAsync(s => s.PlayerId == playerId, ct);

        if (ShouldFetch(stats, await LastPlayedUtcAsync(player.TeamId, ct)))
        {
            var gate = Locks.GetOrAdd(playerId, _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync(ct);
            try
            {
                // Re-read under the lock: an earlier waiter may have just refreshed it.
                stats = await db.PlayerStatistics.FirstOrDefaultAsync(s => s.PlayerId == playerId, ct);
                var lastPlayedUtc = await LastPlayedUtcAsync(player.TeamId, ct);
                if (ShouldFetch(stats, lastPlayedUtc))
                    stats = await RefreshAsync(playerId, stats, lastPlayedUtc, ct);
            }
            finally
            {
                gate.Release();
            }
        }

        return ToDto(player, stats);
    }

    private async Task<DateTime?> LastPlayedUtcAsync(int teamId, CancellationToken ct) =>
        await db.Matches
            .Where(m => (m.HomeTeamId == teamId || m.AwayTeamId == teamId) && FinishedStatuses.Contains(m.Status))
            .Select(m => (DateTime?)m.KickoffUtc)
            .OrderByDescending(d => d)
            .FirstOrDefaultAsync(ct);

    private static bool ShouldFetch(PlayerStatistic? stats, DateTime? lastPlayedUtc)
    {
        if (stats is null) return true; // never attempted

        // We're missing this match-cycle's data: the team has played since our last
        // *successful* sync. (On a miss LastSyncedAt is left behind, so this stays true.)
        var missingLatestData = lastPlayedUtc is not null && stats.LastSyncedAt < lastPlayedUtc.Value;
        // …but retry no more often than the cooldown, regardless of clicks. API-Football
        // backfills sometime after the match, so we re-check every window until it lands.
        var cooldownElapsed = DateTime.UtcNow - stats.LastApiAttemptUtc >= Cooldown;
        return missingLatestData && cooldownElapsed;
    }

    private async Task<PlayerStatistic?> RefreshAsync(int playerId, PlayerStatistic? stats, DateTime? lastPlayedUtc, CancellationToken ct)
    {
        var isNew = stats is null;
        stats ??= PlayerStatistic.Create(playerId);

        ApiPlayerStatsData? fresh;
        try
        {
            fresh = await api.GetPlayerStatisticsAsync(playerId, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "API fetch failed for player {PlayerId}", playerId);
            return isNew ? null : stats; // transient error: fall back to cached (or bio-only)
        }

        if (fresh is null)
        {
            stats.RecordMiss(); // negative cache: stamp the attempt so we don't keep retrying
        }
        else
        {
            // Did the numbers actually move? A non-null response can still be the API's
            // pre-match (lagging) aggregate, so "got data" ≠ "got the latest match".
            var changed = isNew || stats.DiffersFrom(
                fresh.Appearances, fresh.Lineups, fresh.Minutes, fresh.Goals, fresh.Conceded, fresh.Assists,
                fresh.Saves, fresh.Yellow, fresh.YellowRed, fresh.Red, fresh.FoulsDrawn, fresh.FoulsCommitted);

            stats.ApplyFromApi(
                fresh.Firstname, fresh.Lastname, fresh.Age, fresh.BirthDate, fresh.BirthPlace, fresh.BirthCountry,
                fresh.Nationality, fresh.Height, fresh.Weight, fresh.Injured,
                fresh.Appearances, fresh.Lineups, fresh.Minutes, fresh.Number, fresh.Position, fresh.Rating, fresh.Captain,
                fresh.Goals, fresh.Conceded, fresh.Assists, fresh.Saves,
                fresh.Yellow, fresh.YellowRed, fresh.Red, fresh.FoulsDrawn, fresh.FoulsCommitted);

            // Confirm "synced for this cycle" only when the data reflects the latest match:
            //  • the counters changed (or first-ever data), OR
            //  • nothing to wait for (team hasn't played), OR
            //  • the grace window elapsed (player simply didn't feature).
            var graceExpired = lastPlayedUtc is not null && DateTime.UtcNow - lastPlayedUtc.Value >= GraceAfterMatch;
            if (changed || lastPlayedUtc is null || graceExpired)
                stats.MarkSynced();
        }

        if (isNew) db.PlayerStatistics.Add(stats);
        try
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Player {PlayerId} stats refreshed (hasData={HasData}, isNew={IsNew})",
                playerId, fresh is not null, isNew);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to persist player {PlayerId} statistics — serving uncached", playerId);
            return isNew ? null : stats;
        }

        return stats;
    }

    private static PlayerStatsDto ToDto(Player player, PlayerStatistic? stats) => new(
        player.Id, player.Name, stats?.Firstname, stats?.Lastname,
        stats?.Age ?? player.Age, stats?.BirthDate, stats?.BirthPlace, stats?.BirthCountry,
        stats?.Nationality, stats?.Height, stats?.Weight, stats?.Injured ?? false,
        player.PhotoUrl,
        player.Team.Name, player.Team.Code,
        stats?.Appearances, stats?.Lineups, stats?.Minutes, stats?.Number ?? player.ShirtNumber,
        stats?.Position ?? player.Position.ToString(), stats?.Rating, stats?.Captain ?? false,
        stats?.Goals, stats?.Conceded, stats?.Assists, stats?.Saves,
        stats?.Yellow, stats?.YellowRed, stats?.Red,
        stats?.FoulsDrawn, stats?.FoulsCommitted,
        stats?.HasApiData ?? false);
}
