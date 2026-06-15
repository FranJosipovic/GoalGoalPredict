namespace GoalGoalPredict.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = default!;
    public string FirstName { get; private set; } = default!;
    public string LastName { get; private set; } = default!;
    // Null for users who only ever signed in with Google (no local password).
    public string? PasswordHash { get; private set; }
    // Google account subject ("sub") claim — set once a Google identity is linked.
    public string? GoogleSub { get; private set; }
    // Real-email ownership: false until the user clicks the verification link, or
    // true immediately for Google sign-ins (Google vouches for the address).
    public bool EmailVerified { get; private set; }
    public string? EmailVerificationToken { get; private set; }
    public DateTime? EmailVerificationTokenExpiresAt { get; private set; }
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

    // Provision a user from a verified Google identity — no password, email already trusted.
    public static User FromGoogle(string email, string firstName, string lastName, string googleSub)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = email.ToLowerInvariant(),
            FirstName = firstName,
            LastName = lastName,
            PasswordHash = null,
            GoogleSub = googleSub,
            EmailVerified = true,
            CreatedAt = DateTime.UtcNow,
            IsAdmin = false,
        };
    }

    public void SetAdmin(bool isAdmin) => IsAdmin = isAdmin;

    public void SetPasswordHash(string passwordHash) => PasswordHash = passwordHash;

    public void LinkGoogle(string googleSub)
    {
        GoogleSub = googleSub;
        // A linked Google account proves ownership of the address.
        EmailVerified = true;
        EmailVerificationToken = null;
        EmailVerificationTokenExpiresAt = null;
    }

    public void SetEmailVerificationToken(string token, DateTime expiresAt)
    {
        EmailVerificationToken = token;
        EmailVerificationTokenExpiresAt = expiresAt;
    }

    public void MarkEmailVerified()
    {
        EmailVerified = true;
        EmailVerificationToken = null;
        EmailVerificationTokenExpiresAt = null;
    }

    public void ChangeEmail(string email) => Email = email.ToLowerInvariant();

    public void UpdateName(string firstName, string lastName)
    {
        FirstName = firstName;
        LastName = lastName;
    }
}
