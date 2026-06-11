using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchSubstitutions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "match_substitutions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    match_id = table.Column<int>(type: "integer", nullable: false),
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    minute = table.Column<int>(type: "integer", nullable: false),
                    extra_minute = table.Column<int>(type: "integer", nullable: true),
                    player_in_id = table.Column<int>(type: "integer", nullable: true),
                    player_out_id = table.Column<int>(type: "integer", nullable: true),
                    api_event_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_match_substitutions", x => x.id);
                    table.ForeignKey(
                        name: "FK_match_substitutions_matches_match_id",
                        column: x => x.match_id,
                        principalTable: "matches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_match_substitutions_players_player_in_id",
                        column: x => x.player_in_id,
                        principalTable: "players",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_match_substitutions_players_player_out_id",
                        column: x => x.player_out_id,
                        principalTable: "players",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_match_substitutions_match_id_api_event_order",
                table: "match_substitutions",
                columns: new[] { "match_id", "api_event_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_match_substitutions_player_in_id",
                table: "match_substitutions",
                column: "player_in_id");

            migrationBuilder.CreateIndex(
                name: "IX_match_substitutions_player_out_id",
                table: "match_substitutions",
                column: "player_out_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "match_substitutions");
        }
    }
}
