using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGuestPredictions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "guest_predictions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    match_id = table.Column<int>(type: "integer", nullable: false),
                    home_goals = table.Column<int>(type: "integer", nullable: false),
                    away_goals = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_scored = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    total_points = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    scored_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notified = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guest_predictions", x => x.id);
                    table.ForeignKey(
                        name: "FK_guest_predictions_matches_match_id",
                        column: x => x.match_id,
                        principalTable: "matches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "guest_card_predictions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guest_prediction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guest_card_predictions", x => x.id);
                    table.ForeignKey(
                        name: "FK_guest_card_predictions_guest_predictions_guest_prediction_id",
                        column: x => x.guest_prediction_id,
                        principalTable: "guest_predictions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "guest_goalscorer_predictions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    guest_prediction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    goal_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Normal Goal")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_guest_goalscorer_predictions", x => x.id);
                    table.ForeignKey(
                        name: "FK_guest_goalscorer_predictions_guest_predictions_guest_predic~",
                        column: x => x.guest_prediction_id,
                        principalTable: "guest_predictions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_guest_card_predictions_guest_prediction_id",
                table: "guest_card_predictions",
                column: "guest_prediction_id");

            migrationBuilder.CreateIndex(
                name: "IX_guest_goalscorer_predictions_guest_prediction_id",
                table: "guest_goalscorer_predictions",
                column: "guest_prediction_id");

            migrationBuilder.CreateIndex(
                name: "IX_guest_predictions_email_match_id",
                table: "guest_predictions",
                columns: new[] { "email", "match_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_guest_predictions_match_id",
                table: "guest_predictions",
                column: "match_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "guest_card_predictions");

            migrationBuilder.DropTable(
                name: "guest_goalscorer_predictions");

            migrationBuilder.DropTable(
                name: "guest_predictions");
        }
    }
}
