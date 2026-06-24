using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record GoogleSignInInput(string Credential);
public record GoogleSignInOutput(string Token, UserDto User);

public class GoogleSignIn(IUserRepository users, IGoogleTokenVerifier google, ITokenService tokens, IGroupRepository groups)
{
    public async Task<GoogleSignInOutput> ExecuteAsync(GoogleSignInInput input)
    {
        var info = await google.VerifyAsync(input.Credential);
        if (!info.EmailVerified)
            throw new UnauthorizedAccessException("Google account email is not verified.");

        // 1. Already linked → straight in.
        var user = await users.GetByGoogleSubAsync(info.Subject);

        if (user is null)
        {
            // 2. Existing local account with the same (Google-verified) email → link it,
            //    preserving the user's Id and all their groups/points.
            var byEmail = await users.GetByEmailAsync(info.Email);
            if (byEmail is not null)
            {
                byEmail.LinkGoogle(info.Subject);
                await users.UpdateAsync(byEmail);
                user = byEmail;
            }
            else
            {
                // 3. Brand-new user.
                user = User.FromGoogle(info.Email, info.FirstName, info.LastName, info.Subject);
                await users.AddAsync(user);
                await groups.EnsureGlobalMembershipAsync(user.Id);
            }
        }

        var token = tokens.GenerateToken(user);
        return new GoogleSignInOutput(token, UserDto.From(user));
    }
}
