using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SnapshotRulesPerMatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_group_scoring_rules_group_id",
                table: "group_scoring_rules");

            migrationBuilder.AddColumn<int>(
                name: "match_id",
                table: "group_scoring_rules",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_group_scoring_rules_group_id_match_id",
                table: "group_scoring_rules",
                columns: new[] { "group_id", "match_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_group_scoring_rules_group_id_match_id",
                table: "group_scoring_rules");

            migrationBuilder.DropColumn(
                name: "match_id",
                table: "group_scoring_rules");

            migrationBuilder.CreateIndex(
                name: "IX_group_scoring_rules_group_id",
                table: "group_scoring_rules",
                column: "group_id",
                unique: true);
        }
    }
}
