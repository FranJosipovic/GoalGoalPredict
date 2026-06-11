using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using WebPush;

namespace GoalGoalPredict.Infrastructure.Services;

public class PushNotificationService(AppDbContext db, IConfiguration config, ILogger<PushNotificationService> logger)
{
    private VapidDetails GetVapid() => new(
        config["Push:Subject"] ?? "mailto:admin@example.com",
        config["Push:VapidPublicKey"] ?? "",
        config["Push:VapidPrivateKey"] ?? "");

    public async Task SendToGroupAsync(Guid groupId, string title, string body, CancellationToken ct = default, string? url = null)
    {
        var memberIds = await db.GroupMembers
            .Where(m => m.GroupId == groupId)
            .Select(m => m.UserId)
            .ToListAsync(ct);

        await SendToUsersAsync(memberIds, title, body, ct, url);
    }

    // Notify everyone in a group that predicts this real (multi-group) match — once per
    // user even if they're in several participating groups — deep-linking each to one of
    // their groups for the match. Mirrors what sim matches send to their single group.
    public async Task SendToMatchGroupsAsync(int matchId, string title, string body, CancellationToken ct = default)
    {
        var groupIds = await db.Predictions
            .Where(p => p.MatchId == matchId)
            .Select(p => p.GroupId)
            .Distinct()
            .ToListAsync(ct);

        var notified = new HashSet<Guid>();
        foreach (var gid in groupIds)
        {
            var memberIds = await db.GroupMembers
                .Where(m => m.GroupId == gid)
                .Select(m => m.UserId)
                .ToListAsync(ct);

            var fresh = memberIds.Where(id => notified.Add(id)).ToList();
            if (fresh.Count > 0)
                await SendToUsersAsync(fresh, title, body, ct, $"/groups/{gid}/match/{matchId}");
        }
    }

    public async Task SendToUsersAsync(IEnumerable<Guid> userIds, string title, string body, CancellationToken ct = default, string? url = null)
    {
        var subscriptions = await db.PushSubscriptions
            .Where(s => userIds.Contains(s.UserId))
            .ToListAsync(ct);

        if (subscriptions.Count == 0) return;

        var payload = JsonSerializer.Serialize(new { title, body, url, tag = url ?? "ggpredict" });
        var vapid = GetVapid();
        var client = new WebPushClient();
        client.SetVapidDetails(vapid);

        var toRemove = new List<int>();
        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSub = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await client.SendNotificationAsync(pushSub, payload);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
            {
                toRemove.Add(sub.Id);
                logger.LogInformation("Removing expired push subscription {Id}", sub.Id);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to send push to subscription {Id}", sub.Id);
            }
        }

        if (toRemove.Count > 0)
        {
            var stale = db.PushSubscriptions.Where(s => toRemove.Contains(s.Id));
            db.PushSubscriptions.RemoveRange(stale);
            await db.SaveChangesAsync(ct);
        }
    }
}
