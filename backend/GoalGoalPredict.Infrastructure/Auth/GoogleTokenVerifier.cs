using GoalGoalPredict.Application.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;

namespace GoalGoalPredict.Infrastructure.Auth;

public class GoogleTokenVerifier(IConfiguration config) : IGoogleTokenVerifier
{
    public async Task<GoogleUserInfo> VerifyAsync(string idToken)
    {
        var clientId = config["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            throw new InvalidOperationException("Google:ClientId is not configured.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [clientId],
            });
        }
        catch (InvalidJwtException ex)
        {
            throw new UnauthorizedAccessException("Invalid Google credential.", ex);
        }

        // Google sometimes omits given/family name; fall back to the full name or email local-part.
        var first = payload.GivenName;
        var last = payload.FamilyName;
        if (string.IsNullOrWhiteSpace(first))
        {
            var name = payload.Name ?? payload.Email.Split('@')[0];
            var parts = name.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            first = parts.Length > 0 ? parts[0] : name;
            last ??= parts.Length > 1 ? parts[1] : "";
        }

        return new GoogleUserInfo(
            payload.Subject,
            payload.Email,
            payload.EmailVerified,
            first,
            last ?? "");
    }
}
