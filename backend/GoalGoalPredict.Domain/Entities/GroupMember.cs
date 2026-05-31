namespace GoalGoalPredict.Domain.Entities;

public enum GroupRole { Owner, Member }

public class GroupMember
{
    public Guid Id { get; private set; }
    public Guid GroupId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime JoinedAt { get; private set; }
    public GroupRole Role { get; private set; }

    private GroupMember() { }

    public GroupMember(Guid groupId, Guid userId, GroupRole role)
    {
        Id = Guid.NewGuid();
        GroupId = groupId;
        UserId = userId;
        Role = role;
        JoinedAt = DateTime.UtcNow;
    }
}
