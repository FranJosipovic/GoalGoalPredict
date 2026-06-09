using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.Services;

// Compares what is stored in our DB against what API-Football currently returns,
// producing a field-level diff so the admin can decide whether to run a sync.
public class AdminCompareService(AppDbContext db, IApiFootballClient api, ILogger<AdminCompareService> logger)
{
    public record FieldDiff(string Field, string? Db, string? Api);
    // InUse/Active are only populated for "extra in DB" players (null otherwise).
    public record EntityDiff(string Id, string Label, string State, List<FieldDiff> Fields, bool? InUse = null, bool? Active = null);
    public record CompareResult(int DbCount, int ApiCount, int Matched, int Mismatched, int MissingInDb, int ExtraInDb, List<EntityDiff> Diffs);

    // States
    private const string Mismatch = "mismatch";
    private const string MissingInDb = "missing_in_db";   // exists in API, not in DB
    private const string ExtraInDb = "extra_in_db";       // exists in DB, not in API

    public async Task<CompareResult> CompareTeamsAsync(CancellationToken ct = default)
    {
        var apiTeams = await api.GetTeamsAsync(ct);
        var dbTeams = await db.Teams.AsNoTracking().ToListAsync(ct);
        var dbById = dbTeams.ToDictionary(t => t.Id);
        var apiById = apiTeams.ToDictionary(t => t.Id);

        var diffs = new List<EntityDiff>();
        int matched = 0, mismatched = 0, missing = 0, extra = 0;

        foreach (var a in apiTeams)
        {
            if (!dbById.TryGetValue(a.Id, out var d))
            {
                missing++;
                diffs.Add(new EntityDiff(a.Id.ToString(), a.Name, MissingInDb, [
                    new("name", null, a.Name),
                    new("code", null, a.Code),
                    new("country", null, a.Country),
                ]));
                continue;
            }

            var fields = new List<FieldDiff>();
            if (d.Name != a.Name) fields.Add(new("name", d.Name, a.Name));
            if ((d.Code ?? "") != (a.Code ?? "")) fields.Add(new("code", d.Code, a.Code));
            if ((d.Country ?? "") != (a.Country ?? "")) fields.Add(new("country", d.Country, a.Country));
            if ((d.LogoUrl ?? "") != (a.LogoUrl ?? "")) fields.Add(new("logoUrl", d.LogoUrl, a.LogoUrl));

            if (fields.Count > 0) { mismatched++; diffs.Add(new EntityDiff(a.Id.ToString(), a.Name, Mismatch, fields)); }
            else matched++;
        }

        foreach (var d in dbTeams.Where(d => !apiById.ContainsKey(d.Id)))
        {
            extra++;
            diffs.Add(new EntityDiff(d.Id.ToString(), d.Name, ExtraInDb, []));
        }

        return new CompareResult(dbTeams.Count, apiTeams.Count, matched, mismatched, missing, extra, diffs);
    }

    public async Task<CompareResult> CompareFixturesAsync(CancellationToken ct = default)
    {
        var apiFixtures = await api.GetFixturesAsync(ct);
        // Only compare real (ApiFootball) matches — sim matches don't exist in the API.
        var dbMatches = await db.Matches.AsNoTracking()
            .Where(m => m.Source == "ApiFootball")
            .ToListAsync(ct);
        var dbById = dbMatches.ToDictionary(m => m.Id);
        var apiById = apiFixtures.ToDictionary(f => f.Id);

        var diffs = new List<EntityDiff>();
        int matched = 0, mismatched = 0, missing = 0, extra = 0;

        foreach (var a in apiFixtures)
        {
            var label = $"#{a.Id} ({a.Round})";
            if (!dbById.TryGetValue(a.Id, out var d))
            {
                missing++;
                diffs.Add(new EntityDiff(a.Id.ToString(), label, MissingInDb, [
                    new("status", null, a.Status),
                    new("kickoffUtc", null, a.KickoffUtc.ToString("u")),
                    new("score", null, $"{a.HomeGoals}-{a.AwayGoals}"),
                ]));
                continue;
            }

            var fields = new List<FieldDiff>();
            if (d.Status != a.Status) fields.Add(new("status", d.Status, a.Status));
            if (d.KickoffUtc != a.KickoffUtc) fields.Add(new("kickoffUtc", d.KickoffUtc.ToString("u"), a.KickoffUtc.ToString("u")));
            if (d.HomeGoals != a.HomeGoals || d.AwayGoals != a.AwayGoals)
                fields.Add(new("score", $"{d.HomeGoals}-{d.AwayGoals}", $"{a.HomeGoals}-{a.AwayGoals}"));
            if (d.ElapsedMinutes != a.ElapsedMinutes) fields.Add(new("elapsed", d.ElapsedMinutes?.ToString(), a.ElapsedMinutes?.ToString()));
            if ((d.Round ?? "") != (a.Round ?? "")) fields.Add(new("round", d.Round, a.Round));

            if (fields.Count > 0) { mismatched++; diffs.Add(new EntityDiff(a.Id.ToString(), label, Mismatch, fields)); }
            else matched++;
        }

        foreach (var d in dbMatches.Where(m => !apiById.ContainsKey(m.Id)))
        {
            extra++;
            diffs.Add(new EntityDiff(d.Id.ToString(), $"#{d.Id} ({d.Round})", ExtraInDb, []));
        }

        return new CompareResult(dbMatches.Count, apiFixtures.Count, matched, mismatched, missing, extra, diffs);
    }

    public record TeamPlayersCompare(int TeamId, string TeamName, CompareResult Result);

    // Per-team squad diff. When teamId is null, walks every team (throttled to respect API rate limits).
    public async Task<List<TeamPlayersCompare>> ComparePlayersAsync(int? teamId, CancellationToken ct = default)
    {
        var teamsQuery = db.Teams.AsNoTracking().OrderBy(t => t.Name);
        var teams = teamId.HasValue
            ? await teamsQuery.Where(t => t.Id == teamId).ToListAsync(ct)
            : await teamsQuery.ToListAsync(ct);

        var results = new List<TeamPlayersCompare>();
        foreach (var team in teams)
        {
            ct.ThrowIfCancellationRequested();
            if (teamId is null) await Task.Delay(250, ct); // throttle bulk walk

            List<ApiSquadPlayerData> apiPlayers;
            try { apiPlayers = await api.GetSquadAsync(team.Id, ct); }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Squad fetch failed for team {TeamId}", team.Id);
                apiPlayers = [];
            }

            var dbPlayers = await db.Players.AsNoTracking().Where(p => p.TeamId == team.Id).ToListAsync(ct);
            var dbById = dbPlayers.ToDictionary(p => p.Id);
            var apiById = apiPlayers.ToDictionary(p => p.Id);

            var diffs = new List<EntityDiff>();
            int matched = 0, mismatched = 0, missing = 0, extra = 0;

            foreach (var a in apiPlayers)
            {
                if (!dbById.TryGetValue(a.Id, out var d))
                {
                    missing++;
                    diffs.Add(new EntityDiff(a.Id.ToString(), a.Name, MissingInDb, [
                        new("name", null, a.Name),
                        new("number", null, a.Number.ToString()),
                        new("position", null, a.Position),
                    ]));
                    continue;
                }

                var fields = new List<FieldDiff>();
                if (d.Name != a.Name) fields.Add(new("name", d.Name, a.Name));
                if (d.ShirtNumber != a.Number) fields.Add(new("number", d.ShirtNumber.ToString(), a.Number.ToString()));
                if (d.Age != a.Age) fields.Add(new("age", d.Age.ToString(), a.Age.ToString()));
                if (d.Position.ToString() != MapPos(a.Position)) fields.Add(new("position", d.Position.ToString(), MapPos(a.Position)));

                if (fields.Count > 0) { mismatched++; diffs.Add(new EntityDiff(a.Id.ToString(), a.Name, Mismatch, fields)); }
                else matched++;
            }

            var extraPlayers = dbPlayers.Where(p => !apiById.ContainsKey(p.Id)).ToList();
            var referenced = extraPlayers.Count > 0
                ? await CollectReferencedAsync(extraPlayers.Select(p => p.Id).ToList(), ct)
                : [];
            foreach (var d in extraPlayers)
            {
                extra++;
                diffs.Add(new EntityDiff(d.Id.ToString(), d.Name, ExtraInDb, [],
                    InUse: referenced.Contains(d.Id), Active: d.IsActive));
            }

            results.Add(new TeamPlayersCompare(team.Id, team.Name,
                new CompareResult(dbPlayers.Count, apiPlayers.Count, matched, mismatched, missing, extra, diffs)));
        }

        return results;
    }

    // Player ids (from the given candidate set) referenced by predictions or match data.
    private async Task<HashSet<int>> CollectReferencedAsync(List<int> ids, CancellationToken ct)
    {
        var referenced = new HashSet<int>();
        referenced.UnionWith(await db.GoalscorerPredictions.Where(g => ids.Contains(g.PlayerId)).Select(g => g.PlayerId).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.CardPredictions.Where(c => ids.Contains(c.PlayerId)).Select(c => c.PlayerId).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.MatchLineupPlayers.Where(l => ids.Contains(l.PlayerId)).Select(l => l.PlayerId).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.MatchGoals.Where(g => g.ScorerPlayerId != null && ids.Contains(g.ScorerPlayerId.Value)).Select(g => g.ScorerPlayerId!.Value).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.MatchCards.Where(c => c.PlayerId != null && ids.Contains(c.PlayerId.Value)).Select(c => c.PlayerId!.Value).Distinct().ToListAsync(ct));
        referenced.UnionWith(await db.SimulationEvents.Where(s => ids.Contains(s.PlayerId)).Select(s => s.PlayerId).Distinct().ToListAsync(ct));
        return referenced;
    }

    private static string MapPos(string pos) => pos switch
    {
        "Goalkeeper" => "Goalkeeper",
        "Defender" => "Defender",
        "Midfielder" => "Midfielder",
        "Attacker" => "Attacker",
        _ => "Midfielder"
    };
}
