using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PlayerStatsQuotaFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "has_api_data",
                table: "player_statistics",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_api_attempt_at",
                table: "player_statistics",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "has_api_data",
                table: "player_statistics");

            migrationBuilder.DropColumn(
                name: "last_api_attempt_at",
                table: "player_statistics");
        }
    }
}
