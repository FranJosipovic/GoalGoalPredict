namespace GoalGoalPredict.Domain.Entities;

public class Team
{
    public int Id { get; private set; }
    public string Name { get; private set; } = "";
    public string Code { get; private set; } = "";
    public string Country { get; private set; } = "";
    public string LogoUrl { get; private set; } = "";
    public DateTime SyncedAt { get; private set; }

    public ICollection<Player> Players { get; private set; } = [];

    private Team() { }

    public static Team FromApi(int id, string name, string code, string country, string logoUrl) => new()
    {
        Id = id,
        Name = name,
        Code = code ?? "",
        Country = country,
        LogoUrl = logoUrl,
        SyncedAt = DateTime.UtcNow
    };

    public void Update(string name, string code, string country, string logoUrl)
    {
        Name = name;
        Code = code ?? "";
        Country = country;
        LogoUrl = logoUrl;
        SyncedAt = DateTime.UtcNow;
    }
}
