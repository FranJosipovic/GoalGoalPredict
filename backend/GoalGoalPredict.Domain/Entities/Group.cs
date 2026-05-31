namespace GoalGoalPredict.Domain.Entities;

public class Group
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = default!;
    public string InviteCode { get; private set; } = default!;
    public Guid CreatedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private Group() { }

    public Group(string name, Guid createdByUserId)
    {
        Id = Guid.NewGuid();
        Name = name;
        InviteCode = GenerateInviteCode();
        CreatedByUserId = createdByUserId;
        CreatedAt = DateTime.UtcNow;
    }

    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 6)
            .Select(_ => chars[Random.Shared.Next(chars.Length)])
            .ToArray());
    }
}
