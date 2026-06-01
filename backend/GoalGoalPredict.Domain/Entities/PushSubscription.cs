namespace GoalGoalPredict.Domain.Entities;

public class PushSubscription
{
    public int Id { get; private set; }
    public Guid UserId { get; private set; }
    public string Endpoint { get; private set; } = "";
    public string P256dh { get; private set; } = "";
    public string Auth { get; private set; } = "";
    public DateTime CreatedAt { get; private set; }

    private PushSubscription() { }

    public static PushSubscription Create(Guid userId, string endpoint, string p256dh, string auth) => new()
    {
        UserId = userId,
        Endpoint = endpoint,
        P256dh = p256dh,
        Auth = auth,
        CreatedAt = DateTime.UtcNow
    };
}
