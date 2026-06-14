using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStandingsAndTeamStatistics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "standings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    group_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    rank = table.Column<int>(type: "integer", nullable: false),
                    points = table.Column<int>(type: "integer", nullable: false),
                    goals_diff = table.Column<int>(type: "integer", nullable: false),
                    played = table.Column<int>(type: "integer", nullable: false),
                    win = table.Column<int>(type: "integer", nullable: false),
                    draw = table.Column<int>(type: "integer", nullable: false),
                    lose = table.Column<int>(type: "integer", nullable: false),
                    goals_for = table.Column<int>(type: "integer", nullable: false),
                    goals_against = table.Column<int>(type: "integer", nullable: false),
                    form = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    description = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_standings", x => x.id);
                    table.ForeignKey(
                        name: "FK_standings_teams_team_id",
                        column: x => x.team_id,
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "team_statistics",
                columns: table => new
                {
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    form = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    played = table.Column<int>(type: "integer", nullable: false),
                    wins = table.Column<int>(type: "integer", nullable: false),
                    draws = table.Column<int>(type: "integer", nullable: false),
                    loses = table.Column<int>(type: "integer", nullable: false),
                    goals_for = table.Column<int>(type: "integer", nullable: true),
                    goals_against = table.Column<int>(type: "integer", nullable: true),
                    clean_sheets = table.Column<int>(type: "integer", nullable: false),
                    failed_to_score = table.Column<int>(type: "integer", nullable: false),
                    penalty_scored = table.Column<int>(type: "integer", nullable: false),
                    penalty_missed = table.Column<int>(type: "integer", nullable: false),
                    yellow_cards = table.Column<int>(type: "integer", nullable: false),
                    red_cards = table.Column<int>(type: "integer", nullable: false),
                    formation = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_team_statistics", x => x.team_id);
                    table.ForeignKey(
                        name: "FK_team_statistics_teams_team_id",
                        column: x => x.team_id,
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_standings_team_id",
                table: "standings",
                column: "team_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "standings");

            migrationBuilder.DropTable(
                name: "team_statistics");
        }
    }
}
