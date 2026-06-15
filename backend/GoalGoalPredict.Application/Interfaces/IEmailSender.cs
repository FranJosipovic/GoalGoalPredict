namespace GoalGoalPredict.Application.Interfaces;

public interface IEmailSender
{
    /// <summary>Sends the email-verification message; builds the verify link from the configured frontend base URL.</summary>
    Task SendVerificationEmailAsync(string toEmail, string toName, string verificationToken);
}
