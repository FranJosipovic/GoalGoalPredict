using System.Security.Cryptography;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record RegisterUserInput(string Email, string FirstName, string LastName, string Password);
public record RegisterUserOutput(bool RequiresVerification, string Email);

public class RegisterUser(IUserRepository users, IPasswordHasher hasher, IEmailSender email)
{
    public async Task<RegisterUserOutput> ExecuteAsync(RegisterUserInput input)
    {
        var existing = await users.GetByEmailAsync(input.Email);
        if (existing is not null)
            throw new InvalidOperationException("Email is already in use.");

        var passwordHash = hasher.Hash(input.Password);
        var user = new User(input.Email, input.FirstName, input.LastName, passwordHash);

        var token = TokenGenerator.NewToken();
        user.SetEmailVerificationToken(token, DateTime.UtcNow.AddHours(24));
        await users.AddAsync(user);

        await email.SendVerificationEmailAsync(user.Email, user.FirstName, token);

        return new RegisterUserOutput(true, user.Email);
    }
}

internal static class TokenGenerator
{
    public static string NewToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
}
