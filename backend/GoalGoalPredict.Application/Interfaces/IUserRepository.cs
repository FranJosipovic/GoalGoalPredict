using GoalGoalPredict.Domain.Entities;

namespace GoalGoalPredict.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByGoogleSubAsync(string googleSub);
    Task<User?> GetByEmailVerificationTokenAsync(string token);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
}
