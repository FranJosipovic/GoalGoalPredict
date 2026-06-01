using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStep2Tables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "teams",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    code = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    logo_url = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    synced_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_teams", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "matches",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    home_team_id = table.Column<int>(type: "integer", nullable: false),
                    away_team_id = table.Column<int>(type: "integer", nullable: false),
                    kickoff_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    elapsed_minutes = table.Column<int>(type: "integer", nullable: true),
                    home_goals = table.Column<int>(type: "integer", nullable: true),
                    away_goals = table.Column<int>(type: "integer", nullable: true),
                    et_home_goals = table.Column<int>(type: "integer", nullable: true),
                    et_away_goals = table.Column<int>(type: "integer", nullable: true),
                    pen_home_goals = table.Column<int>(type: "integer", nullable: true),
                    pen_away_goals = table.Column<int>(type: "integer", nullable: true),
                    round = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    lineups_available = table.Column<bool>(type: "boolean", nullable: false),
                    is_finished = table.Column<bool>(type: "boolean", nullable: false),
                    last_synced_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_matches", x => x.id);
                    table.ForeignKey(
                        name: "FK_matches_teams_away_team_id",
                        column: x => x.away_team_id,
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_matches_teams_home_team_id",
                        column: x => x.home_team_id,
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "players",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    age = table.Column<int>(type: "integer", nullable: false),
                    shirt_number = table.Column<int>(type: "integer", nullable: false),
                    position = table.Column<string>(type: "text", nullable: false),
                    photo_url = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_players", x => x.id);
                    table.ForeignKey(
                        name: "FK_players_teams_team_id",
                        column: x => x.team_id,
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "predictions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    match_id = table.Column<int>(type: "integer", nullable: false),
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    home_goals = table.Column<int>(type: "integer", nullable: false),
                    away_goals = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_scored = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_predictions", x => x.id);
                    table.ForeignKey(
                        name: "FK_predictions_groups_group_id",
                        column: x => x.group_id,
                        principalTable: "groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_predictions_matches_match_id",
                        column: x => x.match_id,
                        principalTable: "matches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_predictions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "match_goals",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    match_id = table.Column<int>(type: "integer", nullable: false),
                    scorer_player_id = table.Column<int>(type: "integer", nullable: true),
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    minute = table.Column<int>(type: "integer", nullable: false),
                    extra_minute = table.Column<int>(type: "integer", nullable: true),
                    goal_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    api_event_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_match_goals", x => x.id);
                    table.ForeignKey(
                        name: "FK_match_goals_matches_match_id",
                        column: x => x.match_id,
                        principalTable: "matches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_match_goals_players_scorer_player_id",
                        column: x => x.scorer_player_id,
                        principalTable: "players",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "match_lineup_players",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    match_id = table.Column<int>(type: "integer", nullable: false),
                    team_id = table.Column<int>(type: "integer", nullable: false),
                    player_id = table.Column<int>(type: "integer", nullable: false),
                    is_starting = table.Column<bool>(type: "boolean", nullable: false),
                    position = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    shirt_number = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_match_lineup_players", x => x.id);
                    table.ForeignKey(
                        name: "FK_match_lineup_players_matches_match_id",
                        column: x => x.match_id,
                        principalTable: "matches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_match_lineup_players_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "goalscorer_predictions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    prediction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    player_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_goalscorer_predictions", x => x.id);
                    table.ForeignKey(
                        name: "FK_goalscorer_predictions_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_goalscorer_predictions_predictions_prediction_id",
                        column: x => x.prediction_id,
                        principalTable: "predictions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "prediction_scores",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    prediction_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    match_id = table.Column<int>(type: "integer", nullable: false),
                    group_id = table.Column<Guid>(type: "uuid", nullable: false),
                    exact_score_points = table.Column<int>(type: "integer", nullable: false),
                    outcome_points = table.Column<int>(type: "integer", nullable: false),
                    goalscorer_points = table.Column<int>(type: "integer", nullable: false),
                    total_points = table.Column<int>(type: "integer", nullable: false),
                    calculated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_prediction_scores", x => x.id);
                    table.ForeignKey(
                        name: "FK_prediction_scores_predictions_prediction_id",
                        column: x => x.prediction_id,
                        principalTable: "predictions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_goalscorer_predictions_player_id",
                table: "goalscorer_predictions",
                column: "player_id");

            migrationBuilder.CreateIndex(
                name: "IX_goalscorer_predictions_prediction_id",
                table: "goalscorer_predictions",
                column: "prediction_id");

            migrationBuilder.CreateIndex(
                name: "IX_match_goals_match_id_api_event_order",
                table: "match_goals",
                columns: new[] { "match_id", "api_event_order" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_match_goals_scorer_player_id",
                table: "match_goals",
                column: "scorer_player_id");

            migrationBuilder.CreateIndex(
                name: "IX_match_lineup_players_match_id",
                table: "match_lineup_players",
                column: "match_id");

            migrationBuilder.CreateIndex(
                name: "IX_match_lineup_players_player_id",
                table: "match_lineup_players",
                column: "player_id");

            migrationBuilder.CreateIndex(
                name: "IX_matches_away_team_id",
                table: "matches",
                column: "away_team_id");

            migrationBuilder.CreateIndex(
                name: "IX_matches_home_team_id",
                table: "matches",
                column: "home_team_id");

            migrationBuilder.CreateIndex(
                name: "IX_players_team_id",
                table: "players",
                column: "team_id");

            migrationBuilder.CreateIndex(
                name: "IX_prediction_scores_prediction_id",
                table: "prediction_scores",
                column: "prediction_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_predictions_group_id",
                table: "predictions",
                column: "group_id");

            migrationBuilder.CreateIndex(
                name: "IX_predictions_match_id",
                table: "predictions",
                column: "match_id");

            migrationBuilder.CreateIndex(
                name: "IX_predictions_user_id_match_id_group_id",
                table: "predictions",
                columns: new[] { "user_id", "match_id", "group_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "goalscorer_predictions");

            migrationBuilder.DropTable(
                name: "match_goals");

            migrationBuilder.DropTable(
                name: "match_lineup_players");

            migrationBuilder.DropTable(
                name: "prediction_scores");

            migrationBuilder.DropTable(
                name: "players");

            migrationBuilder.DropTable(
                name: "predictions");

            migrationBuilder.DropTable(
                name: "matches");

            migrationBuilder.DropTable(
                name: "teams");
        }
    }
}
