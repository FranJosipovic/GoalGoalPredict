using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record LoginUserInput(string Email, string Password);
public record LoginUserOutput(string Token, UserDto User);

/// <summary>Thrown when credentials are valid but the email hasn't been verified yet.</summary>
public class EmailNotVerifiedException(string email) : Exception("Email not verified.")
{
    public string Email { get; } = email;
}

public class LoginUser(IUserRepository users, IPasswordHasher hasher, ITokenService tokens)
{
    public async Task<LoginUserOutput> ExecuteAsync(LoginUserInput input)
    {
        var user = await users.GetByEmailAsync(input.Email);
        // Users with no password hash are Google-only — they must use Google sign-in.
        if (user is null || user.PasswordHash is null || !hasher.Verify(input.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.EmailVerified)
            throw new EmailNotVerifiedException(user.Email);

        var token = tokens.GenerateToken(user);
        return new LoginUserOutput(token, UserDto.From(user));
    }
}
