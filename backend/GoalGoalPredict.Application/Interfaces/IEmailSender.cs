namespace GoalGoalPredict.Application.Interfaces;

public interface IEmailSender
{
    /// <summary>Sends the email-verification message; builds the verify link from the configured frontend base URL.</summary>
    Task SendVerificationEmailAsync(string toEmail, string toName, string verificationToken);

    /// <summary>Notifies a landing-page guest of their prediction result and nudges them to sign up.</summary>
    Task SendGuestResultEmailAsync(string toEmail, string matchTitle, string predictedScore, string finalScore, int points);
}
