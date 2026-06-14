using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GoalGoalPredict.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class StandingsCompositeKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_standings_team_id",
                table: "standings");

            migrationBuilder.CreateIndex(
                name: "IX_standings_group_name_team_id",
                table: "standings",
                columns: new[] { "group_name", "team_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_standings_team_id",
                table: "standings",
                column: "team_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_standings_group_name_team_id",
                table: "standings");

            migrationBuilder.DropIndex(
                name: "IX_standings_team_id",
                table: "standings");

            migrationBuilder.CreateIndex(
                name: "IX_standings_team_id",
                table: "standings",
                column: "team_id",
                unique: true);
        }
    }
}
