using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record CompleteOnboardingInput(Guid UserId, string? Language);

public class CompleteOnboarding(IUserRepository users)
{
    public async Task<UserDto> ExecuteAsync(CompleteOnboardingInput input)
    {
        var user = await users.GetByIdAsync(input.UserId)
            ?? throw new InvalidOperationException("User not found.");

        user.CompleteOnboarding(input.Language);
        await users.UpdateAsync(user);

        return UserDto.From(user);
    }
}
