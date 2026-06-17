namespace GoalGoalPredict.Domain.Entities;

// Cached per-player season statistics (API-Football players endpoint). One row per
// player; refreshed lazily when the player's team has played since LastSyncedAt.
public class PlayerStatistic
{
    public int PlayerId { get; private set; }

    // Bio
    public string? Firstname { get; private set; }
    public string? Lastname { get; private set; }
    public int? Age { get; private set; }
    public string? BirthDate { get; private set; }
    public string? BirthPlace { get; private set; }
    public string? BirthCountry { get; private set; }
    public string? Nationality { get; private set; }
    public string? Height { get; private set; }
    public string? Weight { get; private set; }
    public bool Injured { get; private set; }

    // Games
    public int? Appearances { get; private set; }
    public int? Lineups { get; private set; }
    public int? Minutes { get; private set; }
    public int? Number { get; private set; }
    public string? Position { get; private set; }
    public string? Rating { get; private set; }
    public bool Captain { get; private set; }

    // Goals
    public int? Goals { get; private set; }
    public int? Conceded { get; private set; }
    public int? Assists { get; private set; }
    public int? Saves { get; private set; }

    // Cards
    public int? Yellow { get; private set; }
    public int? YellowRed { get; private set; }
    public int? Red { get; private set; }

    // Fouls
    public int? FoulsDrawn { get; private set; }
    public int? FoulsCommitted { get; private set; }

    // When we last *successfully* pulled data from the API. Stays put on a miss, so the
    // "team played since our last good sync" check keeps retrying until data arrives.
    public DateTime LastSyncedAt { get; private set; }
    // When we last *attempted* an API fetch (success or miss) — drives the cooldown.
    public DateTime LastApiAttemptUtc { get; private set; }
    // False = the API has no record for this player yet (negative cache).
    public bool HasApiData { get; private set; }

    private PlayerStatistic() { }

    public static PlayerStatistic Create(int playerId)
    {
        var s = new PlayerStatistic { PlayerId = playerId };
        return s;
    }

    public void ApplyFromApi(
        string? firstname, string? lastname, int? age, string? birthDate, string? birthPlace, string? birthCountry,
        string? nationality, string? height, string? weight, bool injured,
        int? appearances, int? lineups, int? minutes, int? number, string? position, string? rating, bool captain,
        int? goals, int? conceded, int? assists, int? saves,
        int? yellow, int? yellowRed, int? red, int? foulsDrawn, int? foulsCommitted)
    {
        Firstname = firstname; Lastname = lastname; Age = age;
        BirthDate = birthDate; BirthPlace = birthPlace; BirthCountry = birthCountry;
        Nationality = nationality; Height = height; Weight = weight; Injured = injured;
        Appearances = appearances; Lineups = lineups; Minutes = minutes; Number = number;
        Position = position; Rating = rating; Captain = captain;
        Goals = goals; Conceded = conceded; Assists = assists; Saves = saves;
        Yellow = yellow; YellowRed = yellowRed; Red = red;
        FoulsDrawn = foulsDrawn; FoulsCommitted = foulsCommitted;
        HasApiData = true;
        // Only the attempt clock advances here. LastSyncedAt is set via MarkSynced(),
        // because a non-null API response may still be the pre-match (lagging) aggregate
        // — the caller decides whether the numbers actually moved.
        LastApiAttemptUtc = DateTime.UtcNow;
    }

    // Call when the freshly-applied data is confirmed to reflect the latest match
    // (its counters changed, or we've waited out the grace window). Stops the retries.
    public void MarkSynced() => LastSyncedAt = DateTime.UtcNow;

    // The API has no record for this player yet — cache the miss so we don't re-hit the
    // API on every click. Bumps ONLY the attempt clock (cooldown); LastSyncedAt stays put
    // so we keep retrying every cooldown window until data lands.
    public void RecordMiss()
    {
        HasApiData = false;
        LastApiAttemptUtc = DateTime.UtcNow;
    }

    // Do the API's volatile counters differ from what we currently hold? Used to tell a
    // genuine post-match update apart from a repeated lagging/pre-match response.
    public bool DiffersFrom(
        int? appearances, int? lineups, int? minutes, int? goals, int? conceded, int? assists,
        int? saves, int? yellow, int? yellowRed, int? red, int? foulsDrawn, int? foulsCommitted) =>
        Appearances != appearances || Lineups != lineups || Minutes != minutes ||
        Goals != goals || Conceded != conceded || Assists != assists || Saves != saves ||
        Yellow != yellow || YellowRed != yellowRed || Red != red ||
        FoulsDrawn != foulsDrawn || FoulsCommitted != foulsCommitted;
}
