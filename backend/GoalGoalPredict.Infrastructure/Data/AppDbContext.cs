using GoalGoalPredict.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GoalGoalPredict.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();

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
    }
}
