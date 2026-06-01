using GoalGoalPredict.Domain.Entities;
using GoalGoalPredict.Infrastructure.Data;

namespace GoalGoalPredict.Infrastructure.UseCases.Admin;

public class CreateSimulationGroup(AppDbContext db)
{
    public async Task<Group> ExecuteAsync(Guid adminUserId, string name, CancellationToken ct = default)
    {
        var group = new Group(name, adminUserId, isSimulation: true);
        db.Groups.Add(group);

        var member = GroupMember.CreateOwner(group.Id, adminUserId);
        db.GroupMembers.Add(member);

        await db.SaveChangesAsync(ct);
        return group;
    }
}
