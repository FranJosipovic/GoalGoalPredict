namespace GoalGoalPredict.Domain.Entities;

public class Group
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = default!;
    public string InviteCode { get; private set; } = default!;
    public Guid CreatedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public bool IsSimulation { get; private set; }

    // The single platform-wide "global" group everyone belongs to. It has no owner and
    // can't be joined/left; it stays locked until an admin opens it for the knockout phase.
    public bool IsGlobal { get; private set; }
    public bool IsLocked { get; private set; }

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

    // The global group has no real owner (CreatedByUserId stays empty) and starts locked.
    public static Group CreateGlobal(string name) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        InviteCode = "GLOBAL",
        CreatedByUserId = Guid.Empty,
        CreatedAt = DateTime.UtcNow,
        IsSimulation = false,
        IsGlobal = true,
        IsLocked = true
    };

    public void SetLocked(bool locked) => IsLocked = locked;

    public void TransferOwnership(Guid newOwnerUserId) => CreatedByUserId = newOwnerUserId;

    public void RegenerateInviteCode() => InviteCode = GenerateInviteCode();

    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 6)
            .Select(_ => chars[Random.Shared.Next(chars.Length)])
            .ToArray());
    }
}
