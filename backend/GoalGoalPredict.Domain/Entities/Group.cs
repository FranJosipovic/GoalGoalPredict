namespace GoalGoalPredict.Domain.Entities;

public class Group
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = default!;
    public string InviteCode { get; private set; } = default!;
    public Guid CreatedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public bool IsSimulation { get; private set; }

    private Group() { }

    public Group(string name, Guid createdByUserId, bool isSimulation = false)
    {
        Id = Guid.NewGuid();
        Name = name;
        InviteCode = GenerateInviteCode();
        CreatedByUserId = createdByUserId;
        CreatedAt = DateTime.UtcNow;
        IsSimulation = isSimulation;
    }

    public void TransferOwnership(Guid newOwnerUserId) => CreatedByUserId = newOwnerUserId;

    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 6)
            .Select(_ => chars[Random.Shared.Next(chars.Length)])
            .ToArray());
    }
}
