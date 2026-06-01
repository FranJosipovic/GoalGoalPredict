namespace GoalGoalPredict.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = default!;
    public string FirstName { get; private set; } = default!;
    public string LastName { get; private set; } = default!;
    public string PasswordHash { get; private set; } = default!;
    public DateTime CreatedAt { get; private set; }
    public bool IsAdmin { get; private set; }

    private User() { }

    public User(string email, string firstName, string lastName, string passwordHash, bool isAdmin = false)
    {
        Id = Guid.NewGuid();
        Email = email.ToLowerInvariant();
        FirstName = firstName;
        LastName = lastName;
        PasswordHash = passwordHash;
        CreatedAt = DateTime.UtcNow;
        IsAdmin = isAdmin;
    }

    public void SetAdmin(bool isAdmin) => IsAdmin = isAdmin;
}
