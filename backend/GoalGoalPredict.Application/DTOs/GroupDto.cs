namespace GoalGoalPredict.Application.DTOs;

public record GroupDto(Guid Id, string Name, string InviteCode, Guid CreatedByUserId, DateTime CreatedAt);

public record GroupPreviewDto(Guid Id, string Name, int MemberCount);

public record GroupMemberDto(Guid UserId, string FirstName, string LastName, string Email, string Role);

public record GroupDetailDto(Guid Id, string Name, string InviteCode, Guid CreatedByUserId, DateTime CreatedAt, List<GroupMemberDto> Members);

public record GroupScoringRulesDto(
    bool ExactScoreEnabled, int ExactScorePoints,
    bool OutcomeEnabled, int OutcomePoints,
    bool GoalscorerEnabled, int ScorerGkPoints, int ScorerDefPoints, int ScorerMidPoints, int ScorerAttPoints,
    bool OwnGoalEnabled, int OwnGoalPoints,
    bool YellowCardEnabled, int YellowCardPoints, int YellowCardMaxPicks,
    bool RedCardEnabled, int RedCardPoints, int RedCardMaxPicks,
    bool MissedPenaltyEnabled, int MissedPenaltyPoints, int MissedPenaltyMaxPicks,
    string CardPredictionMode, int WrongPickPenalty,
    bool IsLocked, bool CanEdit);

public record UpdateGroupRulesRequest(
    bool ExactScoreEnabled, int ExactScorePoints,
    bool OutcomeEnabled, int OutcomePoints,
    bool GoalscorerEnabled, int ScorerGkPoints, int ScorerDefPoints, int ScorerMidPoints, int ScorerAttPoints,
    bool OwnGoalEnabled, int OwnGoalPoints,
    bool YellowCardEnabled, int YellowCardPoints, int YellowCardMaxPicks,
    bool RedCardEnabled, int RedCardPoints, int RedCardMaxPicks,
    bool MissedPenaltyEnabled, int MissedPenaltyPoints, int MissedPenaltyMaxPicks,
    string CardPredictionMode, int WrongPickPenalty);
