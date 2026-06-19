using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record UpdateProfileInput(Guid UserId, string FirstName, string LastName);

public class UpdateProfile(IUserRepository users, IGroupRepository groups, ILeaderboardCache leaderboardCache)
{
    public async Task<UserDto> ExecuteAsync(UpdateProfileInput input)
    {
        var firstName = input.FirstName?.Trim() ?? "";
        var lastName = input.LastName?.Trim() ?? "";

        if (firstName.Length == 0 || lastName.Length == 0)
            throw new InvalidOperationException("First name and last name are required.");

        var user = await users.GetByIdAsync(input.UserId)
            ?? throw new InvalidOperationException("User not found.");

        user.UpdateName(firstName, lastName);
        await users.UpdateAsync(user);

        // The leaderboard shows member names → a rename makes every group this user is in stale.
        var userGroups = await groups.GetByUserIdAsync(input.UserId);
        leaderboardCache.Invalidate(userGroups.Select(g => g.Id));

        return UserDto.From(user);
    }
}
