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
    // False = no longer in the API squad (e.g. cut or injured). Kept for historical
    // attribution (scoring, goals) but hidden from prediction/lineup pickers.
    public bool IsActive { get; private set; } = true;

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
        PhotoUrl = photoUrl,
        IsActive = true
    };

    public void Update(string name, int age, int number, PlayerPosition position, string photoUrl)
    {
        Name = name;
        Age = age;
        ShirtNumber = number;
        Position = position;
        PhotoUrl = photoUrl;
        IsActive = true; // present in API again ⇒ active
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
