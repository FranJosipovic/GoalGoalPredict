using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
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
using Npgsql;
using Scalar.AspNetCore;

// Local dev reads secrets from a .env file; in production (Railway) real env vars are
// injected, so a missing .env must not crash startup.
try { DotNetEnv.Env.Load(); } catch { /* no .env in production */ }

var builder = WebApplication.CreateBuilder(args);

// Railway (and most PaaS) inject the listening port via PORT.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// PostgreSQL — accepts both Npgsql key-value and Railway/Heroku postgres:// URI.
var connectionString = ResolvePostgresConnectionString(builder.Configuration);
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();

// Services
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ILeaderboardCache, LeaderboardCache>();
builder.Services.AddSingleton<IGroupDetailCache, GroupDetailCache>();
builder.Services.AddSingleton<IGroupRulesCache, GroupRulesCache>();
builder.Services.AddSingleton<IMatchDetailCache, MatchDetailCache>();
builder.Services.AddSingleton<IMatchLineupCache, MatchLineupCache>();
builder.Services.AddSingleton<IGroupPredictionsCache, GroupPredictionsCache>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<IGoogleTokenVerifier, GoalGoalPredict.Infrastructure.Auth.GoogleTokenVerifier>();
builder.Services.AddHttpClient<IEmailSender, GoalGoalPredict.Infrastructure.Email.ResendEmailSender>();

// Use cases — Auth & Groups
builder.Services.AddScoped<RegisterUser>();
builder.Services.AddScoped<LoginUser>();
builder.Services.AddScoped<GoogleSignIn>();
builder.Services.AddScoped<LinkGoogleAccount>();
builder.Services.AddScoped<VerifyEmail>();
builder.Services.AddScoped<ResendVerification>();
builder.Services.AddScoped<UpdateProfile>();
builder.Services.AddScoped<CreateGroup>();
builder.Services.AddScoped<JoinGroup>();
builder.Services.AddScoped<GetMyGroups>();
builder.Services.AddScoped<GetGroupDetail>();
builder.Services.AddScoped<GetGroupPreview>();
builder.Services.AddScoped<ResetInviteCode>();
builder.Services.AddScoped<GoalGoalPredict.Infrastructure.UseCases.Groups.GroupRulesUseCase>();
builder.Services.AddScoped<GoalGoalPredict.Infrastructure.UseCases.Groups.KickGroupMember>();

// Use cases — Matches & Predictions
builder.Services.AddScoped<SyncTeamsAndPlayers>();
builder.Services.AddScoped<SyncFixtures>();
builder.Services.AddScoped<SyncMissingPlayers>();
builder.Services.AddScoped<SyncLineups>();
builder.Services.AddScoped<CreateSimulationGroup>();
builder.Services.AddScoped<CreateSimulationMatch>();
builder.Services.AddScoped<SimulateMatchStep>();
builder.Services.AddScoped<PushNotificationService>();
builder.Services.AddScoped<EffectiveRulesService>();
builder.Services.AddScoped<PollLiveMatch>();
builder.Services.AddScoped<FinalizeMatch>();
builder.Services.AddScoped<SyncMatchScoring>();
builder.Services.AddScoped<UpsertPrediction>();
builder.Services.AddScoped<GetMyPrediction>();
builder.Services.AddScoped<GetMyPredictions>();
builder.Services.AddScoped<GetMatches>();
builder.Services.AddScoped<GetGroupPredictions>();
builder.Services.AddScoped<GetGroupLeaderboard>();
builder.Services.AddScoped<GoalGoalPredict.Infrastructure.UseCases.Players.GetPlayerStatistics>();

// Use cases — Admin management & compare
builder.Services.AddScoped<AdminCompareService>();
builder.Services.AddScoped<DeleteGroup>();
builder.Services.AddScoped<DeleteUser>();
builder.Services.AddScoped<RemoveGroupMember>();
builder.Services.AddScoped<TransferGroupOwner>();
builder.Services.AddScoped<PrunePlayers>();
builder.Services.AddScoped<GoalGoalPredict.Infrastructure.UseCases.Tournament.SyncStandings>();
builder.Services.AddScoped<GoalGoalPredict.Infrastructure.UseCases.Tournament.SyncTeamStatistics>();
builder.Services.AddScoped<GoalGoalPredict.Infrastructure.UseCases.Tournament.SyncTopScorers>();

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
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is not configured.");
const string devJwtKey = "goal-goal-predict-super-secret-key-min-32-chars!!";
if (!builder.Environment.IsDevelopment() && (jwtKey == devJwtKey || jwtKey.Length < 32))
    throw new InvalidOperationException(
        "Production requires a strong Jwt__Key (>= 32 chars and not the dev default). Set it as an environment variable.");
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

// CORS — lock to known origins in production (set Cors__AllowedOrigins__0=...).
// Auth uses Bearer tokens (no cookies), so no AllowCredentials is needed.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOrigins.Length > 0)
            policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod();
        else
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

// Rate limiting — throttle credential endpoints per client IP to blunt brute force.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

// Behind Railway's proxy — restore the real client IP from X-Forwarded-For so the
// rate limiter partitions per user, not per proxy.
var fwd = new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto };
fwd.KnownIPNetworks.Clear();
fwd.KnownProxies.Clear();
app.UseForwardedHeaders(fwd);

// Apply pending EF migrations on startup so a fresh production DB is created/updated.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

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

// TLS is terminated at the Railway edge; redirecting inside the container would loop.
if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Resolve the Postgres connection string. Accepts the native Npgsql key-value format
// (Host=...;Port=...;...) or a Railway/Heroku-style URI (postgres://user:pass@host:port/db),
// converting the latter so it doesn't blow up Npgsql's parser.
static string? ResolvePostgresConnectionString(IConfiguration cfg)
{
    var cs = cfg.GetConnectionString("Default");
    if (string.IsNullOrWhiteSpace(cs))
        cs = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (string.IsNullOrWhiteSpace(cs))
        return cs;

    if (cs.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        cs.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(cs);
        var creds = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Username = Uri.UnescapeDataString(creds[0]),
            Password = creds.Length > 1 ? Uri.UnescapeDataString(creds[1]) : "",
            Database = uri.AbsolutePath.TrimStart('/'),
            SslMode = SslMode.Prefer
        };
        cs = builder.ConnectionString;
    }
    return cs;
}
