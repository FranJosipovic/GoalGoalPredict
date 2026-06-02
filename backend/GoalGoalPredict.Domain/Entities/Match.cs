namespace GoalGoalPredict.Domain.Entities;

public class Match
{
    public int Id { get; private set; }
    public int HomeTeamId { get; private set; }
    public int AwayTeamId { get; private set; }
    public DateTime KickoffUtc { get; private set; }
    public string Status { get; private set; } = "NS";
    public int? ElapsedMinutes { get; private set; }
    public int? HomeGoals { get; private set; }
    public int? AwayGoals { get; private set; }
    public int? ExtraTimeHomeGoals { get; private set; }
    public int? ExtraTimeAwayGoals { get; private set; }
    public int? PenaltyHomeGoals { get; private set; }
    public int? PenaltyAwayGoals { get; private set; }
    public string Round { get; private set; } = "";
    public bool LineupsAvailable { get; private set; }
    public bool LineupRevealNotified { get; private set; }
    public bool IsFinished { get; private set; }
    public DateTime LastSyncedAt { get; private set; }
    public string Source { get; private set; } = "ApiFootball";
    public Guid? SimulationGroupId { get; private set; }

    public Team HomeTeam { get; private set; } = null!;
    public Team AwayTeam { get; private set; } = null!;
    public ICollection<MatchLineupPlayer> LineupPlayers { get; private set; } = [];
    public ICollection<MatchGoal> Goals { get; private set; } = [];

    private Match() { }

    public static Match FromApi(
        int id, int homeTeamId, int awayTeamId, DateTime kickoffUtc,
        string status, int? elapsed,
        int? homeGoals, int? awayGoals,
        int? etHome, int? etAway,
        int? penHome, int? penAway,
        string round) => new()
    {
        Id = id,
        HomeTeamId = homeTeamId,
        AwayTeamId = awayTeamId,
        KickoffUtc = kickoffUtc,
        Status = status,
        ElapsedMinutes = elapsed,
        HomeGoals = homeGoals,
        AwayGoals = awayGoals,
        ExtraTimeHomeGoals = etHome,
        ExtraTimeAwayGoals = etAway,
        PenaltyHomeGoals = penHome,
        PenaltyAwayGoals = penAway,
        Round = round,
        LineupsAvailable = false,
        IsFinished = false,
        LastSyncedAt = DateTime.UtcNow
    };

    public void UpdateFromApi(
        string status, int? elapsed,
        int? homeGoals, int? awayGoals,
        int? etHome, int? etAway,
        int? penHome, int? penAway)
    {
        Status = status;
        ElapsedMinutes = elapsed;
        HomeGoals = homeGoals;
        AwayGoals = awayGoals;
        ExtraTimeHomeGoals = etHome;
        ExtraTimeAwayGoals = etAway;
        PenaltyHomeGoals = penHome;
        PenaltyAwayGoals = penAway;
        LastSyncedAt = DateTime.UtcNow;
    }

    public void SetLineupsAvailable() => LineupsAvailable = true;
    public void MarkLineupRevealNotified() => LineupRevealNotified = true;
    public void SetFinished() => IsFinished = true;
    public void TouchSyncedAt() => LastSyncedAt = DateTime.UtcNow;

    public bool IsLive => Status is "1H" or "HT" or "2H" or "ET" or "P";
    public bool IsSimulation => Source == "Simulation";
    public bool NeedsLineupSync =>
        Source == "ApiFootball" &&
        Status == "NS" && !LineupsAvailable &&
        KickoffUtc <= DateTime.UtcNow.AddMinutes(35) &&
        KickoffUtc > DateTime.UtcNow.AddMinutes(-10);

    public static Match CreateSimulation(int id, int homeTeamId, int awayTeamId, DateTime kickoffUtc, string round, Guid simulationGroupId) => new()
    {
        Id = id,
        HomeTeamId = homeTeamId,
        AwayTeamId = awayTeamId,
        KickoffUtc = kickoffUtc,
        Status = "NS",
        Round = round,
        Source = "Simulation",
        SimulationGroupId = simulationGroupId,
        LineupsAvailable = true,
        IsFinished = false,
        LastSyncedAt = DateTime.UtcNow
    };
}
