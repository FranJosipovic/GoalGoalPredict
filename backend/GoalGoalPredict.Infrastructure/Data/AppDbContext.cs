using GoalGoalPredict.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<MatchLineupPlayer> MatchLineupPlayers => Set<MatchLineupPlayer>();
    public DbSet<MatchGoal> MatchGoals => Set<MatchGoal>();
    public DbSet<Prediction> Predictions => Set<Prediction>();
    public DbSet<GoalscorerPrediction> GoalscorerPredictions => Set<GoalscorerPrediction>();
    public DbSet<PredictionScore> PredictionScores => Set<PredictionScore>();
    public DbSet<SimulationEvent> SimulationEvents => Set<SimulationEvent>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("users");
            b.HasKey(u => u.Id);
            b.Property(u => u.Id).HasColumnName("id");
            b.Property(u => u.Email).HasColumnName("email").IsRequired().HasMaxLength(256);
            b.Property(u => u.FirstName).HasColumnName("first_name").IsRequired().HasMaxLength(100);
            b.Property(u => u.LastName).HasColumnName("last_name").IsRequired().HasMaxLength(100);
            b.Property(u => u.PasswordHash).HasColumnName("password_hash").IsRequired();
            b.Property(u => u.CreatedAt).HasColumnName("created_at");
            b.Property(u => u.IsAdmin).HasColumnName("is_admin").HasDefaultValue(false);
            b.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Group>(b =>
        {
            b.ToTable("groups");
            b.HasKey(g => g.Id);
            b.Property(g => g.Id).HasColumnName("id");
            b.Property(g => g.Name).HasColumnName("name").IsRequired().HasMaxLength(100);
            b.Property(g => g.InviteCode).HasColumnName("invite_code").IsRequired().HasMaxLength(8);
            b.Property(g => g.CreatedByUserId).HasColumnName("created_by_user_id");
            b.Property(g => g.CreatedAt).HasColumnName("created_at");
            b.Property(g => g.IsSimulation).HasColumnName("is_simulation").HasDefaultValue(false);
            b.HasIndex(g => g.InviteCode).IsUnique();
        });

        modelBuilder.Entity<GroupMember>(b =>
        {
            b.ToTable("group_members");
            b.HasKey(gm => gm.Id);
            b.Property(gm => gm.Id).HasColumnName("id");
            b.Property(gm => gm.GroupId).HasColumnName("group_id");
            b.Property(gm => gm.UserId).HasColumnName("user_id");
            b.Property(gm => gm.Role).HasColumnName("role").HasConversion<string>();
            b.Property(gm => gm.JoinedAt).HasColumnName("joined_at");
            b.HasIndex(gm => new { gm.GroupId, gm.UserId }).IsUnique();
        });

        modelBuilder.Entity<Team>(b =>
        {
            b.ToTable("teams");
            b.HasKey(t => t.Id);
            b.Property(t => t.Id).HasColumnName("id").ValueGeneratedNever();
            b.Property(t => t.Name).HasColumnName("name").IsRequired().HasMaxLength(150);
            b.Property(t => t.Code).HasColumnName("code").HasMaxLength(5);
            b.Property(t => t.Country).HasColumnName("country").HasMaxLength(100);
            b.Property(t => t.LogoUrl).HasColumnName("logo_url").HasMaxLength(300);
            b.Property(t => t.SyncedAt).HasColumnName("synced_at");
        });

        modelBuilder.Entity<Player>(b =>
        {
            b.ToTable("players");
            b.HasKey(p => p.Id);
            b.Property(p => p.Id).HasColumnName("id").ValueGeneratedNever();
            b.Property(p => p.TeamId).HasColumnName("team_id");
            b.Property(p => p.Name).HasColumnName("name").IsRequired().HasMaxLength(150);
            b.Property(p => p.Age).HasColumnName("age");
            b.Property(p => p.ShirtNumber).HasColumnName("shirt_number");
            b.Property(p => p.Position).HasColumnName("position").HasConversion<string>();
            b.Property(p => p.PhotoUrl).HasColumnName("photo_url").HasMaxLength(300);
            b.HasOne(p => p.Team).WithMany(t => t.Players).HasForeignKey(p => p.TeamId);
        });

        modelBuilder.Entity<Match>(b =>
        {
            b.ToTable("matches");
            b.HasKey(m => m.Id);
            b.Property(m => m.Id).HasColumnName("id").ValueGeneratedNever();
            b.Property(m => m.HomeTeamId).HasColumnName("home_team_id");
            b.Property(m => m.AwayTeamId).HasColumnName("away_team_id");
            b.Property(m => m.KickoffUtc).HasColumnName("kickoff_utc");
            b.Property(m => m.Status).HasColumnName("status").HasMaxLength(10);
            b.Property(m => m.ElapsedMinutes).HasColumnName("elapsed_minutes");
            b.Property(m => m.HomeGoals).HasColumnName("home_goals");
            b.Property(m => m.AwayGoals).HasColumnName("away_goals");
            b.Property(m => m.ExtraTimeHomeGoals).HasColumnName("et_home_goals");
            b.Property(m => m.ExtraTimeAwayGoals).HasColumnName("et_away_goals");
            b.Property(m => m.PenaltyHomeGoals).HasColumnName("pen_home_goals");
            b.Property(m => m.PenaltyAwayGoals).HasColumnName("pen_away_goals");
            b.Property(m => m.Round).HasColumnName("round").HasMaxLength(100);
            b.Property(m => m.LineupsAvailable).HasColumnName("lineups_available");
            b.Property(m => m.LineupRevealNotified).HasColumnName("lineup_reveal_notified").HasDefaultValue(false);
            b.Property(m => m.IsFinished).HasColumnName("is_finished");
            b.Property(m => m.LastSyncedAt).HasColumnName("last_synced_at");
            b.Property(m => m.Source).HasColumnName("source").HasMaxLength(20).HasDefaultValue("ApiFootball");
            b.Property(m => m.SimulationGroupId).HasColumnName("simulation_group_id");
            b.HasOne(m => m.HomeTeam).WithMany().HasForeignKey(m => m.HomeTeamId);
            b.HasOne(m => m.AwayTeam).WithMany().HasForeignKey(m => m.AwayTeamId);
            b.Ignore(m => m.IsLive);
            b.Ignore(m => m.IsSimulation);
            b.Ignore(m => m.NeedsLineupSync);
        });

        modelBuilder.Entity<MatchLineupPlayer>(b =>
        {
            b.ToTable("match_lineup_players");
            b.HasKey(l => l.Id);
            b.Property(l => l.Id).HasColumnName("id");
            b.Property(l => l.MatchId).HasColumnName("match_id");
            b.Property(l => l.TeamId).HasColumnName("team_id");
            b.Property(l => l.PlayerId).HasColumnName("player_id");
            b.Property(l => l.IsStarting).HasColumnName("is_starting");
            b.Property(l => l.Position).HasColumnName("position").HasMaxLength(5);
            b.Property(l => l.ShirtNumber).HasColumnName("shirt_number");
            b.HasOne(l => l.Match).WithMany(m => m.LineupPlayers).HasForeignKey(l => l.MatchId);
            b.HasOne(l => l.Player).WithMany().HasForeignKey(l => l.PlayerId);
        });

        modelBuilder.Entity<MatchGoal>(b =>
        {
            b.ToTable("match_goals");
            b.HasKey(g => g.Id);
            b.Property(g => g.Id).HasColumnName("id");
            b.Property(g => g.MatchId).HasColumnName("match_id");
            b.Property(g => g.ScorerPlayerId).HasColumnName("scorer_player_id");
            b.Property(g => g.TeamId).HasColumnName("team_id");
            b.Property(g => g.Minute).HasColumnName("minute");
            b.Property(g => g.ExtraMinute).HasColumnName("extra_minute");
            b.Property(g => g.GoalType).HasColumnName("goal_type").HasMaxLength(30);
            b.Property(g => g.ApiEventOrder).HasColumnName("api_event_order");
            b.HasOne(g => g.Match).WithMany(m => m.Goals).HasForeignKey(g => g.MatchId);
            b.HasOne(g => g.Scorer).WithMany().HasForeignKey(g => g.ScorerPlayerId);
            b.Ignore(g => g.CountsForScorer);
            b.HasIndex(g => new { g.MatchId, g.ApiEventOrder }).IsUnique();
        });

        modelBuilder.Entity<Prediction>(b =>
        {
            b.ToTable("predictions");
            b.HasKey(p => p.Id);
            b.Property(p => p.Id).HasColumnName("id");
            b.Property(p => p.UserId).HasColumnName("user_id");
            b.Property(p => p.MatchId).HasColumnName("match_id");
            b.Property(p => p.GroupId).HasColumnName("group_id");
            b.Property(p => p.HomeGoals).HasColumnName("home_goals");
            b.Property(p => p.AwayGoals).HasColumnName("away_goals");
            b.Property(p => p.CreatedAt).HasColumnName("created_at");
            b.Property(p => p.UpdatedAt).HasColumnName("updated_at");
            b.Property(p => p.IsScored).HasColumnName("is_scored");
            b.HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId);
            b.HasOne(p => p.Match).WithMany().HasForeignKey(p => p.MatchId);
            b.HasOne(p => p.Group).WithMany().HasForeignKey(p => p.GroupId);
            b.HasMany(p => p.GoalscorerPredictions).WithOne(g => g.Prediction).HasForeignKey(g => g.PredictionId);
            b.HasOne(p => p.Score).WithOne(s => s.Prediction).HasForeignKey<PredictionScore>(s => s.PredictionId);
            b.HasIndex(p => new { p.UserId, p.MatchId, p.GroupId }).IsUnique();
        });

        modelBuilder.Entity<GoalscorerPrediction>(b =>
        {
            b.ToTable("goalscorer_predictions");
            b.HasKey(g => g.Id);
            b.Property(g => g.Id).HasColumnName("id");
            b.Property(g => g.PredictionId).HasColumnName("prediction_id");
            b.Property(g => g.PlayerId).HasColumnName("player_id");
            b.HasOne(g => g.Player).WithMany().HasForeignKey(g => g.PlayerId);
        });

        modelBuilder.Entity<PredictionScore>(b =>
        {
            b.ToTable("prediction_scores");
            b.HasKey(s => s.Id);
            b.Property(s => s.Id).HasColumnName("id");
            b.Property(s => s.PredictionId).HasColumnName("prediction_id");
            b.Property(s => s.UserId).HasColumnName("user_id");
            b.Property(s => s.MatchId).HasColumnName("match_id");
            b.Property(s => s.GroupId).HasColumnName("group_id");
            b.Property(s => s.ExactScorePoints).HasColumnName("exact_score_points");
            b.Property(s => s.OutcomePoints).HasColumnName("outcome_points");
            b.Property(s => s.GoalscorerPoints).HasColumnName("goalscorer_points");
            b.Property(s => s.TotalPoints).HasColumnName("total_points");
            b.Property(s => s.CalculatedAt).HasColumnName("calculated_at");
            b.HasIndex(s => s.PredictionId).IsUnique();
        });

        modelBuilder.Entity<SimulationEvent>(b =>
        {
            b.ToTable("simulation_events");
            b.HasKey(e => e.Id);
            b.Property(e => e.Id).HasColumnName("id");
            b.Property(e => e.MatchId).HasColumnName("match_id");
            b.Property(e => e.PlayerId).HasColumnName("player_id");
            b.Property(e => e.TeamId).HasColumnName("team_id");
            b.Property(e => e.Minute).HasColumnName("minute");
            b.Property(e => e.GoalType).HasColumnName("goal_type").HasMaxLength(30);
            b.Property(e => e.IsProcessed).HasColumnName("is_processed");
            b.Property(e => e.ProcessedAt).HasColumnName("processed_at");
            b.HasOne(e => e.Match).WithMany().HasForeignKey(e => e.MatchId);
            b.HasOne(e => e.Player).WithMany().HasForeignKey(e => e.PlayerId);
        });

        modelBuilder.Entity<PushSubscription>(b =>
        {
            b.ToTable("push_subscriptions");
            b.HasKey(p => p.Id);
            b.Property(p => p.Id).HasColumnName("id");
            b.Property(p => p.UserId).HasColumnName("user_id");
            b.Property(p => p.Endpoint).HasColumnName("endpoint").IsRequired();
            b.Property(p => p.P256dh).HasColumnName("p256dh").IsRequired();
            b.Property(p => p.Auth).HasColumnName("auth").IsRequired();
            b.Property(p => p.CreatedAt).HasColumnName("created_at");
            b.HasIndex(p => new { p.UserId, p.Endpoint }).IsUnique();
        });
    }
}
