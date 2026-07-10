using GoalGoalPredict.Application.Interfaces;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;

namespace GoalGoalPredict.Infrastructure.Auth;

public class GoogleTokenVerifier(IConfiguration config) : IGoogleTokenVerifier
{
    public async Task<GoogleUserInfo> VerifyAsync(string idToken)
    {
        // Accept any of the configured OAuth client IDs as a valid audience. The web (PWA)
        // sends tokens minted for the web client; native iOS/Android send tokens minted for
        // their own client IDs (via the app's serverClientId/webClientId). We trust them all.
        var audiences = config.GetSection("Google:ClientIds").GetChildren()
            .Select(c => c.Value)
            .Concat([config["Google:ClientId"]])
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id!)
            .Distinct()
            .ToArray();
        if (audiences.Length == 0)
            throw new InvalidOperationException("No Google client IDs are configured (Google:ClientId / Google:ClientIds).");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = audiences,
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
