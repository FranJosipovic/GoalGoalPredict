namespace GoalGoalPredict.Domain.Entities;

public enum PlayerPosition { Goalkeeper, Defender, Midfielder, Attacker }

public class Player
{
    public int Id { get; private set; }
    public int TeamId { get; private set; }
    public string Name { get; private set; } = "";
    public int Age { get; private set; }
    public int ShirtNumber { get; private set; }
    public PlayerPosition Position { get; private set; }
    public string PhotoUrl { get; private set; } = "";

    public Team Team { get; private set; } = null!;

    private Player() { }

    public static Player FromApi(int id, int teamId, string name, int age, int number, PlayerPosition position, string photoUrl) => new()
    {
        Id = id,
        TeamId = teamId,
        Name = name,
        Age = age,
        ShirtNumber = number,
        Position = position,
        PhotoUrl = photoUrl
    };

    public void Update(string name, int age, int number, PlayerPosition position, string photoUrl)
    {
        Name = name;
        Age = age;
        ShirtNumber = number;
        Position = position;
        PhotoUrl = photoUrl;
    }
}
