namespace GoalGoalPredict.Application.Interfaces;

public record GoogleUserInfo(string Subject, string Email, bool EmailVerified, string FirstName, string LastName);

public interface IGoogleTokenVerifier
{
    /// <summary>Validates a Google ID token (credential) and returns its identity claims.</summary>
    /// <exception cref="UnauthorizedAccessException">Thrown when the token is invalid.</exception>
    Task<GoogleUserInfo> VerifyAsync(string idToken);
}
