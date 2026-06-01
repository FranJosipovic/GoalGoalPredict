using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.DTOs;

public record UserDto(Guid Id, string Email, string FirstName, string LastName, bool IsAdmin)
{
    public static UserDto From(User user) =>
        new(user.Id, user.Email, user.FirstName, user.LastName, user.IsAdmin);
}
