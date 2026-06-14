using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTopScorers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "top_scorers",
                columns: table => new
                {
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    photo_url = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    nationality = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    team_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    team_logo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    goals = table.Column<int>(type: "integer", nullable: false),
                    assists = table.Column<int>(type: "integer", nullable: false),
                    appearances = table.Column<int>(type: "integer", nullable: false),
                    minutes = table.Column<int>(type: "integer", nullable: false),
                    penalties_scored = table.Column<int>(type: "integer", nullable: false),
                    rank = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_top_scorers", x => x.player_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "top_scorers");
        }
    }
}
