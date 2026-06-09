using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScoringRulesAndCardPredictions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "card_type",
                table: "simulation_events",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "event_kind",
                table: "simulation_events",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Goal");

            migrationBuilder.AddColumn<int>(
                name: "missed_penalty_points",
                table: "prediction_scores",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "own_goal_points",
                table: "prediction_scores",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "red_card_points",
                table: "prediction_scores",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "yellow_card_points",
                table: "prediction_scores",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "goal_type",
                table: "goalscorer_predictions",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Normal Goal");

            migrationBuilder.CreateTable(
                name: "card_predictions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    prediction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_card_predictions", x => x.id);
                    table.ForeignKey(
                        name: "FK_card_predictions_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_card_predictions_predictions_prediction_id",
                        column: x => x.prediction_id,
                        principalTable: "predictions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "group_scoring_rules",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    exact_score_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    exact_score_points = table.Column<int>(type: "integer", nullable: false),
                    outcome_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    outcome_points = table.Column<int>(type: "integer", nullable: false),
                    goalscorer_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    scorer_gk_points = table.Column<int>(type: "integer", nullable: false),
                    scorer_def_points = table.Column<int>(type: "integer", nullable: false),
                    scorer_mid_points = table.Column<int>(type: "integer", nullable: false),
                    scorer_att_points = table.Column<int>(type: "integer", nullable: false),
                    own_goal_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    own_goal_points = table.Column<int>(type: "integer", nullable: false),
                    yellow_card_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    yellow_card_points = table.Column<int>(type: "integer", nullable: false),
                    yellow_card_max_picks = table.Column<int>(type: "integer", nullable: false),
                    red_card_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    red_card_points = table.Column<int>(type: "integer", nullable: false),
                    red_card_max_picks = table.Column<int>(type: "integer", nullable: false),
                    missed_penalty_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    missed_penalty_points = table.Column<int>(type: "integer", nullable: false),
                    missed_penalty_max_picks = table.Column<int>(type: "integer", nullable: false),
                    card_prediction_mode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    wrong_pick_penalty = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_scoring_rules", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "match_cards",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    match_id = table.Column<int>(type: "integer", nullable: false),
                    player_id = table.Column<int>(type: "integer", nullable: true),
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    minute = table.Column<int>(type: "integer", nullable: false),
                    extra_minute = table.Column<int>(type: "integer", nullable: true),
                    card_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    api_event_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_match_cards", x => x.id);
                    table.ForeignKey(
                        name: "FK_match_cards_matches_match_id",
                        column: x => x.match_id,
                        principalTable: "matches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_match_cards_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_card_predictions_player_id",
                table: "card_predictions",
                column: "player_id");

            migrationBuilder.CreateIndex(
                name: "IX_card_predictions_prediction_id",
                table: "card_predictions",
                column: "prediction_id");

            migrationBuilder.CreateIndex(
                name: "IX_group_scoring_rules_group_id",
                table: "group_scoring_rules",
                column: "group_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_match_cards_match_id_api_event_order",
                table: "match_cards",
                columns: new[] { "match_id", "api_event_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_match_cards_player_id",
                table: "match_cards",
                column: "player_id");

            // Backfill a default scoring-rules row for every existing group so they keep
            // scoring exactly as before (exact 7, outcome 2, GK/DEF 4, MID 2, ATT 1).
            migrationBuilder.Sql(@"
                INSERT INTO group_scoring_rules (
                    group_id, exact_score_enabled, exact_score_points, outcome_enabled, outcome_points,
                    goalscorer_enabled, scorer_gk_points, scorer_def_points, scorer_mid_points, scorer_att_points,
                    own_goal_enabled, own_goal_points,
                    yellow_card_enabled, yellow_card_points, yellow_card_max_picks,
                    red_card_enabled, red_card_points, red_card_max_picks,
                    missed_penalty_enabled, missed_penalty_points, missed_penalty_max_picks,
                    card_prediction_mode, wrong_pick_penalty, updated_at)
                SELECT g.id, true, 7, true, 2,
                    true, 4, 4, 2, 1,
                    true, 6,
                    true, 1, 2,
                    true, 3, 1,
                    true, 3, 1,
                    'Limited', 1, now() at time zone 'utc'
                FROM groups g
                WHERE NOT EXISTS (SELECT 1 FROM group_scoring_rules r WHERE r.group_id = g.id);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "card_predictions");

            migrationBuilder.DropTable(
                name: "group_scoring_rules");

            migrationBuilder.DropTable(
                name: "match_cards");

            migrationBuilder.DropColumn(
                name: "card_type",
                table: "simulation_events");

            migrationBuilder.DropColumn(
                name: "event_kind",
                table: "simulation_events");

            migrationBuilder.DropColumn(
                name: "missed_penalty_points",
                table: "prediction_scores");

            migrationBuilder.DropColumn(
                name: "own_goal_points",
                table: "prediction_scores");

            migrationBuilder.DropColumn(
                name: "red_card_points",
                table: "prediction_scores");

            migrationBuilder.DropColumn(
                name: "yellow_card_points",
                table: "prediction_scores");

            migrationBuilder.DropColumn(
                name: "goal_type",
                table: "goalscorer_predictions");
        }
    }
}
