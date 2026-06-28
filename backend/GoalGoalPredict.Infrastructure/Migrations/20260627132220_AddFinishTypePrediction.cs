using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFinishTypePrediction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "finish_type",
                table: "predictions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "finish_type_points",
                table: "prediction_scores",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "finish_type_enabled",
                table: "group_scoring_rules",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "finish_type_points",
                table: "group_scoring_rules",
                type: "integer",
                nullable: false,
                defaultValue: 3);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "finish_type",
                table: "predictions");

            migrationBuilder.DropColumn(
                name: "finish_type_points",
                table: "prediction_scores");

            migrationBuilder.DropColumn(
                name: "finish_type_enabled",
                table: "group_scoring_rules");

            migrationBuilder.DropColumn(
                name: "finish_type_points",
                table: "group_scoring_rules");
        }
    }
}
