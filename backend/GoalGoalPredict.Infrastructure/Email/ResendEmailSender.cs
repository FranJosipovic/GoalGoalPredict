using System.Net.Http.Headers;
using System.Net.Http.Json;
using GoalGoalPredict.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GoalGoalPredict.Infrastructure.Email;

// Sends transactional email via Resend's REST API (https://resend.com/docs/api-reference/emails).
// Just an authenticated POST — no SDK dependency needed.
public class ResendEmailSender(HttpClient http, IConfiguration config, ILogger<ResendEmailSender> logger) : IEmailSender
{
    public async Task SendVerificationEmailAsync(string toEmail, string toName, string verificationToken)
    {
        var baseUrl = (config["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var verificationLink = $"{baseUrl}/verify-email?token={verificationToken}";

        var apiKey = config["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            // No key (e.g. local dev) — log the link so the flow is still testable.
            logger.LogWarning("Resend not configured; verification link for {Email}: {Link}", toEmail, verificationLink);
            return;
        }

        var fromAddress = config["Email:FromAddress"] ?? "onboarding@resend.dev";
        var fromName = config["Email:FromName"] ?? "GoalGoalPredict";
        var encodedName = System.Net.WebUtility.HtmlEncode(toName);

        var html = $"""
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0b0f0d">
              <h2 style="margin:0 0 8px">Confirm your email ⚽</h2>
              <p>Hi {encodedName}, tap the button below to verify your email and start predicting.</p>
              <p style="text-align:center;margin:28px 0">
                <a href="{verificationLink}" style="background:#16a34a;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Verify email</a>
              </p>
              <p style="color:#64748b;font-size:13px">Or paste this link into your browser:<br>{verificationLink}</p>
              <p style="color:#94a3b8;font-size:12px">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
            </div>
            """;

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = JsonContent.Create(new
        {
            from = $"{fromName} <{fromAddress}>",
            to = new[] { toEmail },
            subject = "Verify your GoalGoalPredict email",
            html,
        });

        using var resp = await http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            // Best-effort: log and move on. The user already exists and can hit "Resend".
            var body = await resp.Content.ReadAsStringAsync();
            logger.LogError("Resend send failed ({Status}) for {Email}: {Body}", resp.StatusCode, toEmail, body);
        }
    }
}
