using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record VerifyEmailInput(string Token);
public record VerifyEmailOutput(string Token, UserDto User);

public class VerifyEmail(IUserRepository users, ITokenService tokens)
{
    public async Task<VerifyEmailOutput> ExecuteAsync(VerifyEmailInput input)
    {
        var user = string.IsNullOrWhiteSpace(input.Token)
            ? null
            : await users.GetByEmailVerificationTokenAsync(input.Token);

        if (user is null)
            throw new InvalidOperationException("This verification link is invalid.");

        if (user.EmailVerified)
        {
            // Already verified (e.g. link clicked twice) — issue a session anyway.
            return new VerifyEmailOutput(tokens.GenerateToken(user), UserDto.From(user));
        }

        if (user.EmailVerificationTokenExpiresAt is null || user.EmailVerificationTokenExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("This verification link has expired. Request a new one.");

        user.MarkEmailVerified();
        await users.UpdateAsync(user);

        // Log them straight in on the device that clicked the link.
        return new VerifyEmailOutput(tokens.GenerateToken(user), UserDto.From(user));
    }
}
