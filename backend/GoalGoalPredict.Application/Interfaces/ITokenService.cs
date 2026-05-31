using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.Interfaces;

public interface ITokenService
{
    string GenerateToken(User user);
}
