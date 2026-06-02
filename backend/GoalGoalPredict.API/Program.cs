using System.Text;
using GoalGoalPredict.Application.Interfaces;
using GoalGoalPredict.Application.UseCases.Auth;
using GoalGoalPredict.Application.UseCases.Groups;
using GoalGoalPredict.Infrastructure.UseCases.Matches;
using GoalGoalPredict.Infrastructure.UseCases.Predictions;
using GoalGoalPredict.Infrastructure.ApiFootball;
using GoalGoalPredict.Infrastructure.Auth;
using GoalGoalPredict.Infrastructure.Data;
using GoalGoalPredict.Infrastructure.Jobs;
using GoalGoalPredict.Infrastructure.Repositories;
using GoalGoalPredict.Infrastructure.Services;
using GoalGoalPredict.Infrastructure.UseCases.Admin;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();

// Services
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();

// Use cases — Auth & Groups
builder.Services.AddScoped<RegisterUser>();
builder.Services.AddScoped<LoginUser>();
builder.Services.AddScoped<CreateGroup>();
builder.Services.AddScoped<JoinGroup>();
builder.Services.AddScoped<GetMyGroups>();
builder.Services.AddScoped<GetGroupDetail>();

// Use cases — Matches & Predictions
builder.Services.AddScoped<SyncTeamsAndPlayers>();
builder.Services.AddScoped<SyncFixtures>();
builder.Services.AddScoped<SyncMissingPlayers>();
builder.Services.AddScoped<SyncLineups>();
builder.Services.AddScoped<CreateSimulationGroup>();
builder.Services.AddScoped<CreateSimulationMatch>();
builder.Services.AddScoped<SimulateMatchStep>();
builder.Services.AddScoped<PushNotificationService>();
builder.Services.AddScoped<PollLiveMatch>();
builder.Services.AddScoped<FinalizeMatch>();
builder.Services.AddScoped<UpsertPrediction>();
builder.Services.AddScoped<GetMyPrediction>();
builder.Services.AddScoped<GetMyPredictions>();
builder.Services.AddScoped<GetMatches>();
builder.Services.AddScoped<GetGroupPredictions>();
builder.Services.AddScoped<GetGroupLeaderboard>();

// API Football HTTP client
builder.Services.AddHttpClient<IApiFootballClient, ApiFootballClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["ApiFootball:BaseUrl"] ?? "https://v3.football.api-sports.io/");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// Background services
builder.Services.AddHostedService<StartupSyncService>();
builder.Services.AddHostedService<MatchSchedulerService>();

// JWT
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            NameClaimType = "sub"
        };
    });

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title = "GoalGoalPredict API";
        options.Theme = ScalarTheme.DeepSpace;
        options.DefaultHttpClient = new(ScalarTarget.JavaScript, ScalarClient.Fetch);
    });
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
