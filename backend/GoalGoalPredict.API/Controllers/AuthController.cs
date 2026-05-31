using System.Security.Claims;
using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Application.UseCases.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(RegisterUser register, LoginUser login, IUserRepository users) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        try
        {
            var result = await register.ExecuteAsync(new RegisterUserInput(req.Email, req.FirstName, req.LastName, req.Password));
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        try
        {
            var result = await login.ExecuteAsync(new LoginUserInput(req.Email, req.Password));
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (sub is null || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var user = await users.GetByIdAsync(userId);
        if (user is null) return NotFound();

        return Ok(UserDto.From(user));
    }
}

public record RegisterRequest(string Email, string FirstName, string LastName, string Password);
public record LoginRequest(string Email, string Password);
