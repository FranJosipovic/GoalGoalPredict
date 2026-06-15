using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record LinkGoogleOutput(string Token, UserDto User);

/// <summary>
/// Attaches a Google identity to an <b>existing</b> account (preserving its Id and points)
/// and updates that account's email to the Google address. Used when a user's stored email
/// differs from the Google account they want to sign in with — e.g. an unverified/typo'd
/// email being switched to a real Google one. Identity is proven either by an authenticated
/// session (<see cref="ForUserAsync"/>) or by valid email+password (<see cref="WithCredentialsAsync"/>).
/// </summary>
public class LinkGoogleAccount(
    IUserRepository users,
    IGoogleTokenVerifier google,
    ITokenService tokens,
    IPasswordHasher hasher)
{
    public async Task<LinkGoogleOutput> ForUserAsync(Guid userId, string credential)
    {
        var user = await users.GetByIdAsync(userId)
            ?? throw new UnauthorizedAccessException("Account not found.");
        return await LinkCoreAsync(user, credential);
    }

    public async Task<LinkGoogleOutput> WithCredentialsAsync(string email, string password, string credential)
    {
        var user = await users.GetByEmailAsync(email);
        if (user is null || user.PasswordHash is null || !hasher.Verify(password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");
        return await LinkCoreAsync(user, credential);
    }

    private async Task<LinkGoogleOutput> LinkCoreAsync(User user, string credential)
    {
        var info = await google.VerifyAsync(credential);
        if (!info.EmailVerified)
            throw new UnauthorizedAccessException("Google account email is not verified.");

        // The Google account must not already belong to a different user.
        var googleOwner = await users.GetByGoogleSubAsync(info.Subject);
        if (googleOwner is not null && googleOwner.Id != user.Id)
            throw new InvalidOperationException("This Google account is already linked to another GoalGoalPredict account.");

        // Repoint this account's email at the Google address (the whole point of the flow),
        // unless another account already owns that email.
        if (!string.Equals(user.Email, info.Email, StringComparison.OrdinalIgnoreCase))
        {
            var emailOwner = await users.GetByEmailAsync(info.Email);
            if (emailOwner is not null && emailOwner.Id != user.Id)
                throw new InvalidOperationException("Another account already uses that Google email.");
            user.ChangeEmail(info.Email);
        }

        user.LinkGoogle(info.Subject); // also marks the email verified
        await users.UpdateAsync(user);

        return new LinkGoogleOutput(tokens.GenerateToken(user), UserDto.From(user));
    }
}
