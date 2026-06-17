using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerStatistics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "player_statistics",
                columns: table => new
                {
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    firstname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    lastname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    age = table.Column<int>(type: "integer", nullable: true),
                    birth_date = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    birth_place = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    birth_country = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    nationality = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    height = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    weight = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    injured = table.Column<bool>(type: "boolean", nullable: false),
                    appearances = table.Column<int>(type: "integer", nullable: true),
                    lineups = table.Column<int>(type: "integer", nullable: true),
                    minutes = table.Column<int>(type: "integer", nullable: true),
                    number = table.Column<int>(type: "integer", nullable: true),
                    position = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    rating = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    captain = table.Column<bool>(type: "boolean", nullable: false),
                    goals = table.Column<int>(type: "integer", nullable: true),
                    conceded = table.Column<int>(type: "integer", nullable: true),
                    assists = table.Column<int>(type: "integer", nullable: true),
                    saves = table.Column<int>(type: "integer", nullable: true),
                    yellow = table.Column<int>(type: "integer", nullable: true),
                    yellow_red = table.Column<int>(type: "integer", nullable: true),
                    red = table.Column<int>(type: "integer", nullable: true),
                    fouls_drawn = table.Column<int>(type: "integer", nullable: true),
                    fouls_committed = table.Column<int>(type: "integer", nullable: true),
                    last_synced_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_player_statistics", x => x.player_id);
                    table.ForeignKey(
                        name: "FK_player_statistics_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "player_statistics");
        }
    }
}
