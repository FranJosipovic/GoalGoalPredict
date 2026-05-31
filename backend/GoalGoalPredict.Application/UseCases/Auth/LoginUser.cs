using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;

namespace GoalGoalPredict.Application.UseCases.Auth;

public record LoginUserInput(string Email, string Password);
public record LoginUserOutput(string Token, UserDto User);

public class LoginUser(IUserRepository users, IPasswordHasher hasher, ITokenService tokens)
{
    public async Task<LoginUserOutput> ExecuteAsync(LoginUserInput input)
    {
        var user = await users.GetByEmailAsync(input.Email);
        if (user is null || !hasher.Verify(input.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        var token = tokens.GenerateToken(user);
        return new LoginUserOutput(token, UserDto.From(user));
    }
}
