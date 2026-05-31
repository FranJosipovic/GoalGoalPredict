namespace GoalGoalPredict.Application.DTOs;

public record GroupDto(Guid Id, string Name, string InviteCode, Guid CreatedByUserId, DateTime CreatedAt);

public record GroupMemberDto(Guid UserId, string FirstName, string LastName, string Email, string Role);

public record GroupDetailDto(Guid Id, string Name, string InviteCode, Guid CreatedByUserId, DateTime CreatedAt, List<GroupMemberDto> Members);
