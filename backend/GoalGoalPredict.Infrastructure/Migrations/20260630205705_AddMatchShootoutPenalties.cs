using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchShootoutPenalties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "match_shootout_penalties",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    match_id = table.Column<int>(type: "integer", nullable: false),
                    player_id = table.Column<int>(type: "integer", nullable: true),
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    scored = table.Column<bool>(type: "boolean", nullable: false),
                    api_event_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_match_shootout_penalties", x => x.id);
                    table.ForeignKey(
                        name: "FK_match_shootout_penalties_matches_match_id",
                        column: x => x.match_id,
                        principalTable: "matches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_match_shootout_penalties_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_match_shootout_penalties_match_id_api_event_order",
                table: "match_shootout_penalties",
                columns: new[] { "match_id", "api_event_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_match_shootout_penalties_player_id",
                table: "match_shootout_penalties",
                column: "player_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "match_shootout_penalties");
        }
    }
}
