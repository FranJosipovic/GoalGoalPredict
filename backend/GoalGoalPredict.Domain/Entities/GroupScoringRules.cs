namespace GoalGoalPredict.Domain.Entities;

/// <summary>
/// How card-style picks (yellow / red / missed penalty) are constrained to stop
/// players from simply picking every player.
/// </summary>
public enum CardPredictionMode
{
    /// Each category allows up to MaxPicks players; no penalty for wrong picks.
    Limited,
    /// Exactly one player per category.
    Single,
    /// Unlimited picks, but each wrong pick subtracts WrongPickPenalty points.
    Net
}

/// <summary>
/// Per-group, owner-editable scoring configuration. One row per group.
/// </summary>
public class GroupScoringRules
{
    public int Id { get; private set; }
    public Guid GroupId { get; private set; }
    // null = the live, owner-editable rules for the group.
    // non-null = a frozen snapshot of the rules as they were when that match kicked off.
    public int? MatchId { get; private set; }

    public bool ExactScoreEnabled { get; private set; }
    public int ExactScorePoints { get; private set; }

    public bool OutcomeEnabled { get; private set; }
    public int OutcomePoints { get; private set; }

    // Goalscorer (Normal Goal / Penalty): position-based, type must match.
    public bool GoalscorerEnabled { get; private set; }
    public int ScorerGkPoints { get; private set; }
    public int ScorerDefPoints { get; private set; }
    public int ScorerMidPoints { get; private set; }
    public int ScorerAttPoints { get; private set; }

    // Own goal: flat points, position ignored.
    public bool OwnGoalEnabled { get; private set; }
    public int OwnGoalPoints { get; private set; }

    public bool YellowCardEnabled { get; private set; }
    public int YellowCardPoints { get; private set; }
    public int YellowCardMaxPicks { get; private set; }

    public bool RedCardEnabled { get; private set; }
    public int RedCardPoints { get; private set; }
    public int RedCardMaxPicks { get; private set; }

    public bool MissedPenaltyEnabled { get; private set; }
    public int MissedPenaltyPoints { get; private set; }
    public int MissedPenaltyMaxPicks { get; private set; }

    // Knockout-only: predict how the tie ends (Regular / Extra time / Penalties).
    public bool FinishTypeEnabled { get; private set; }
    public int FinishTypePoints { get; private set; }

    public CardPredictionMode CardPredictionMode { get; private set; }
    public int WrongPickPenalty { get; private set; }

    public DateTime UpdatedAt { get; private set; }

    private GroupScoringRules() { }

    public static GroupScoringRules CreateDefault(Guid groupId) => new()
    {
        GroupId = groupId,
        ExactScoreEnabled = true,
        ExactScorePoints = 7,
        OutcomeEnabled = true,
        OutcomePoints = 2,
        GoalscorerEnabled = true,
        ScorerGkPoints = 4,
        ScorerDefPoints = 4,
        ScorerMidPoints = 2,
        ScorerAttPoints = 1,
        OwnGoalEnabled = true,
        OwnGoalPoints = 6,
        YellowCardEnabled = true,
        YellowCardPoints = 1,
        YellowCardMaxPicks = 2,
        RedCardEnabled = true,
        RedCardPoints = 3,
        RedCardMaxPicks = 1,
        // Missed-penalty prediction retired — off by default, columns kept for historic scores.
        MissedPenaltyEnabled = false,
        MissedPenaltyPoints = 3,
        MissedPenaltyMaxPicks = 1,
        FinishTypeEnabled = true,
        FinishTypePoints = 3,
        CardPredictionMode = CardPredictionMode.Limited,
        WrongPickPenalty = 1,
        UpdatedAt = DateTime.UtcNow
    };

    /// Freeze a copy of these rules for a specific match (a kickoff snapshot).
    public GroupScoringRules CloneForMatch(int matchId) => new()
    {
        GroupId = GroupId,
        MatchId = matchId,
        ExactScoreEnabled = ExactScoreEnabled, ExactScorePoints = ExactScorePoints,
        OutcomeEnabled = OutcomeEnabled, OutcomePoints = OutcomePoints,
        GoalscorerEnabled = GoalscorerEnabled,
        ScorerGkPoints = ScorerGkPoints, ScorerDefPoints = ScorerDefPoints,
        ScorerMidPoints = ScorerMidPoints, ScorerAttPoints = ScorerAttPoints,
        OwnGoalEnabled = OwnGoalEnabled, OwnGoalPoints = OwnGoalPoints,
        YellowCardEnabled = YellowCardEnabled, YellowCardPoints = YellowCardPoints, YellowCardMaxPicks = YellowCardMaxPicks,
        RedCardEnabled = RedCardEnabled, RedCardPoints = RedCardPoints, RedCardMaxPicks = RedCardMaxPicks,
        MissedPenaltyEnabled = MissedPenaltyEnabled, MissedPenaltyPoints = MissedPenaltyPoints, MissedPenaltyMaxPicks = MissedPenaltyMaxPicks,
        FinishTypeEnabled = FinishTypeEnabled, FinishTypePoints = FinishTypePoints,
        CardPredictionMode = CardPredictionMode, WrongPickPenalty = WrongPickPenalty,
        UpdatedAt = DateTime.UtcNow
    };

    /// Points for a goalscorer pick of the given position (Normal/Penalty goals).
    public int ScorerPointsFor(PlayerPosition position) => position switch
    {
        PlayerPosition.Goalkeeper => ScorerGkPoints,
        PlayerPosition.Defender => ScorerDefPoints,
        PlayerPosition.Midfielder => ScorerMidPoints,
        PlayerPosition.Attacker => ScorerAttPoints,
        _ => 0
    };

    /// Effective cap on picks for a card-style category given the current mode.
    public int MaxPicksFor(CardKind kind) => CardPredictionMode switch
    {
        CardPredictionMode.Single => 1,
        CardPredictionMode.Net => int.MaxValue,
        _ => kind switch
        {
            CardKind.Yellow => YellowCardMaxPicks,
            CardKind.Red => RedCardMaxPicks,
            CardKind.MissedPenalty => MissedPenaltyMaxPicks,
            _ => 0
        }
    };

    public bool EnabledFor(CardKind kind) => kind switch
    {
        CardKind.Yellow => YellowCardEnabled,
        CardKind.Red => RedCardEnabled,
        CardKind.MissedPenalty => MissedPenaltyEnabled,
        _ => false
    };

    public int PointsFor(CardKind kind) => kind switch
    {
        CardKind.Yellow => YellowCardPoints,
        CardKind.Red => RedCardPoints,
        CardKind.MissedPenalty => MissedPenaltyPoints,
        _ => 0
    };

    public void Update(
        bool exactScoreEnabled, int exactScorePoints,
        bool outcomeEnabled, int outcomePoints,
        bool goalscorerEnabled, int scorerGk, int scorerDef, int scorerMid, int scorerAtt,
        bool ownGoalEnabled, int ownGoalPoints,
        bool yellowEnabled, int yellowPoints, int yellowMax,
        bool redEnabled, int redPoints, int redMax,
        bool missedPenEnabled, int missedPenPoints, int missedPenMax,
        bool finishTypeEnabled, int finishTypePoints,
        CardPredictionMode mode, int wrongPickPenalty)
    {
        ExactScoreEnabled = exactScoreEnabled;
        ExactScorePoints = Math.Max(0, exactScorePoints);
        OutcomeEnabled = outcomeEnabled;
        OutcomePoints = Math.Max(0, outcomePoints);
        GoalscorerEnabled = goalscorerEnabled;
        ScorerGkPoints = Math.Max(0, scorerGk);
        ScorerDefPoints = Math.Max(0, scorerDef);
        ScorerMidPoints = Math.Max(0, scorerMid);
        ScorerAttPoints = Math.Max(0, scorerAtt);
        OwnGoalEnabled = ownGoalEnabled;
        OwnGoalPoints = Math.Max(0, ownGoalPoints);
        YellowCardEnabled = yellowEnabled;
        YellowCardPoints = Math.Max(0, yellowPoints);
        YellowCardMaxPicks = Math.Max(1, yellowMax);
        RedCardEnabled = redEnabled;
        RedCardPoints = Math.Max(0, redPoints);
        RedCardMaxPicks = Math.Max(1, redMax);
        MissedPenaltyEnabled = missedPenEnabled;
        MissedPenaltyPoints = Math.Max(0, missedPenPoints);
        MissedPenaltyMaxPicks = Math.Max(1, missedPenMax);
        FinishTypeEnabled = finishTypeEnabled;
        FinishTypePoints = Math.Max(0, finishTypePoints);
        CardPredictionMode = mode;
        WrongPickPenalty = Math.Max(0, wrongPickPenalty);
        UpdatedAt = DateTime.UtcNow;
    }
}
