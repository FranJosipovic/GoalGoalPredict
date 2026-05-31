using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record RegisterUserInput(string Email, string FirstName, string LastName, string Password);
public record RegisterUserOutput(string Token, UserDto User);

public class RegisterUser(IUserRepository users, IPasswordHasher hasher, ITokenService tokens)
{
    public async Task<RegisterUserOutput> ExecuteAsync(RegisterUserInput input)
    {
        var existing = await users.GetByEmailAsync(input.Email);
        if (existing is not null)
            throw new InvalidOperationException("Email is already in use.");

        var passwordHash = hasher.Hash(input.Password);
        var user = new User(input.Email, input.FirstName, input.LastName, passwordHash);
        await users.AddAsync(user);

        var token = tokens.GenerateToken(user);
        return new RegisterUserOutput(token, UserDto.From(user));
    }
}
