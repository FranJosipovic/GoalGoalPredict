using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record ResendVerificationInput(string Email);

public class ResendVerification(IUserRepository users, IEmailSender email)
{
    public async Task ExecuteAsync(ResendVerificationInput input)
    {
        var user = await users.GetByEmailAsync(input.Email);
        // Silently no-op for unknown / already-verified / Google-only accounts so the
        // endpoint can't be used to probe which emails exist.
        if (user is null || user.EmailVerified || user.PasswordHash is null)
            return;

        var token = TokenGenerator.NewToken();
        user.SetEmailVerificationToken(token, DateTime.UtcNow.AddHours(24));
        await users.UpdateAsync(user);

        await email.SendVerificationEmailAsync(user.Email, user.FirstName, token);
    }
}
