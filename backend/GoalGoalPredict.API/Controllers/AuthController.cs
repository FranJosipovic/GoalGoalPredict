using System.Security.Claims;
using GoalGoalPredict.Application.DTOs;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Application.UseCases.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GoalGoalPredict.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    RegisterUser register,
    LoginUser login,
    GoogleSignIn googleSignIn,
    LinkGoogleAccount linkGoogle,
    VerifyEmail verifyEmail,
    ResendVerification resendVerification,
    UpdateProfile updateProfile,
    IUserRepository users) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
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
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        try
        {
            var result = await login.ExecuteAsync(new LoginUserInput(req.Email, req.Password));
            return Ok(result);
        }
        catch (EmailNotVerifiedException ex)
        {
            // Distinct code so the UI can show the "verify your email" prompt + resend.
            return StatusCode(StatusCodes.Status403Forbidden,
                new { error = ex.Message, code = "email_not_verified", email = ex.Email });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpPost("google")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Google([FromBody] GoogleRequest req)
    {
        try
        {
            var result = await googleSignIn.ExecuteAsync(new GoogleSignInInput(req.Credential));
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    // Link Google to the CURRENT (already signed-in) account — preserves Id/points and
    // updates the account's email to the Google address. Identity proven by the JWT.
    [HttpPost("google/link")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> LinkGoogleAuthed([FromBody] GoogleRequest req)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (sub is null || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        try
        {
            var result = await linkGoogle.ForUserAsync(userId, req.Credential);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    // Link Google to an existing account identified by email+password (the user typed valid
    // credentials but couldn't verify the address — e.g. a fake/typo email). Lets them switch
    // to a different Google address while keeping their account.
    [HttpPost("google/link-credentials")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> LinkGoogleWithCredentials([FromBody] GoogleLinkCredentialsRequest req)
    {
        try
        {
            var result = await linkGoogle.WithCredentialsAsync(req.Email, req.Password, req.Credential);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPost("verify-email")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyEmailEndpoint([FromBody] VerifyEmailRequest req)
    {
        try
        {
            var result = await verifyEmail.ExecuteAsync(new VerifyEmailInput(req.Token));
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("resend-verification")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResendVerificationEndpoint([FromBody] ResendVerificationRequest req)
    {
        await resendVerification.ExecuteAsync(new ResendVerificationInput(req.Email));
        // Always 200 — don't reveal whether the email exists.
        return Ok(new { ok = true });
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

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (sub is null || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        try
        {
            var result = await updateProfile.ExecuteAsync(
                new UpdateProfileInput(userId, req.FirstName, req.LastName));
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

public record RegisterRequest(string Email, string FirstName, string LastName, string Password);
public record LoginRequest(string Email, string Password);
public record GoogleRequest(string Credential);
public record GoogleLinkCredentialsRequest(string Email, string Password, string Credential);
public record VerifyEmailRequest(string Token);
public record ResendVerificationRequest(string Email);
public record UpdateProfileRequest(string FirstName, string LastName);
