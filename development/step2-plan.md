# Step 2 — Predictions, Matches & Scoring

## Overview

Enable users to place predictions on World Cup 2026 matches within their groups.
Each user predicts per group independently. Predictions lock at kickoff. After kickoff,
all group members' predictions become visible. Live scoring updates during the match.

---

## API Football — Key Facts

- **Base URL**: `https://v3.football.api-sports.io`
- **Auth header**: `x-apisports-key: {API_KEY}`
- **League ID**: `1` (FIFA World Cup)
- **Season**: `2026`
- **Total fixtures**: 104 (48 teams, group stage + knockouts)
- **Limit**: 7500 req/day

### ⚠️ Coverage Warning

The `/leagues?id=1&season=2026` response currently shows:
```json
"coverage": {
  "fixtures": { "events": false, "lineups": false }
}
```
This likely means data is not yet available (tournament starts 2026-06-11).
**Lineups and events endpoints will be tested live once the tournament begins.**
Build the system to handle empty responses gracefully.

---

## Endpoints We Use

### 1. GET /teams?league=1&season=2026
Fetch all 48 WC teams. One-time sync.

**Response fields we store:**
```
response[].team.id        → Team.ApiId (int)
response[].team.name      → Team.Name
response[].team.code      → Team.Code  (e.g. "CRO")
response[].team.country   → Team.Country
response[].team.logo      → Team.LogoUrl
```

### 2. GET /players/squads?team={id}
Fetch squad for one team. Called 48 times (one per team) during initial sync.
No pagination — returns full squad in one call.

**Response fields we store:**
```
response[0].players[].id        → Player.ApiId (int)
response[0].players[].name      → Player.Name
response[0].players[].age       → Player.Age
response[0].players[].number    → Player.ShirtNumber
response[0].players[].position  → Player.Position
  Values: "Goalkeeper" | "Defender" | "Midfielder" | "Attacker"
response[0].players[].photo     → Player.PhotoUrl
```

### 3. GET /fixtures?league=1&season=2026
Fetch all 104 fixtures. Called once daily to sync schedule and results.

**Response fields we store:**
```
response[].fixture.id               → Match.ApiId (int)
response[].fixture.date             → Match.KickoffUtc (ISO 8601 → UTC DateTime)
response[].fixture.timestamp        → Match.KickoffTimestamp (long, backup)
response[].fixture.status.short     → Match.Status
  Values: "NS" | "1H" | "HT" | "2H" | "ET" | "P" | "FT" | "AET" | "PEN" | "CANC" | "PST"
response[].fixture.status.elapsed   → Match.ElapsedMinutes (int?)
response[].league.round             → Match.Round  (e.g. "Group Stage - 1")
response[].teams.home.id            → Match.HomeTeamApiId
response[].teams.away.id            → Match.AwayTeamApiId
response[].teams.home.winner        → (derived after FT)
response[].goals.home               → Match.HomeGoals (int?)
response[].goals.away               → Match.AwayGoals (int?)
response[].score.extratime.home     → Match.ExtraTimeHomeGoals (int?)
response[].score.extratime.away     → Match.ExtraTimeAwayGoals (int?)
response[].score.penalty.home       → Match.PenaltyHomeGoals (int?)
response[].score.penalty.away       → Match.PenaltyAwayGoals (int?)
```

### 4. GET /fixtures/lineups?fixture={id}
Fetch confirmed lineups. Called 30 min before each match kickoff.

**Response fields we store:**
```
response[].team.id                          → LineupEntry.TeamApiId
response[].formation                        → (optional, not stored)
response[].startXI[].player.id              → LineupEntry.PlayerApiId
response[].startXI[].player.pos             → LineupEntry.Position
  Values: "G" | "D" | "M" | "F"
response[].startXI[].player.number          → LineupEntry.ShirtNumber
response[].startXI → IsStarting = true
response[].substitutes[].player.id          → LineupEntry.PlayerApiId
response[].substitutes → IsStarting = false
```

**Note**: `pos` in lineups uses short codes (G/D/M/F), different from squad positions
("Goalkeeper"/"Defender"/"Midfielder"/"Attacker"). Map accordingly.

### 5. GET /fixtures/events?fixture={id}
Fetch match events during live polling. Filter to goals only.

**Response fields we store:**
```
response[].time.elapsed     → MatchGoal.Minute (int)
response[].time.extra       → MatchGoal.ExtraMinute (int?)
response[].team.id          → MatchGoal.TeamApiId
response[].player.id        → MatchGoal.ScorerApiId (int?)
response[].player.name      → (for display, not stored — join via Player table)
response[].type             → filter: only "Goal"
response[].detail           → MatchGoal.GoalType
  Values: "Normal Goal" | "Own Goal" | "Penalty" | "Missed Penalty"
```

**Scoring rule**: Only "Normal Goal" and "Penalty" count for goalscorer predictions.
"Own Goal" does NOT reward the scorer prediction.

---

## Database Schema

### New Tables

```sql
-- 48 WC teams
Teams
  Id          INT PK (API id, not auto-increment)
  Name        NVARCHAR(100)
  Code        CHAR(3)
  Country     NVARCHAR(100)
  LogoUrl     NVARCHAR(300)
  SyncedAt    DATETIME

-- All players from all 48 squads (~26 per team = ~1248 players)
Players
  Id          INT PK (API id, not auto-increment)
  TeamId      INT FK → Teams
  Name        NVARCHAR(150)
  Age         INT
  ShirtNumber INT
  Position    NVARCHAR(20)  -- "Goalkeeper"|"Defender"|"Midfielder"|"Attacker"
  PhotoUrl    NVARCHAR(300)

-- All 104 WC fixtures
Matches
  Id              INT PK (API id, not auto-increment)
  HomeTeamId      INT FK → Teams
  AwayTeamId      INT FK → Teams
  KickoffUtc      DATETIME
  Status          NVARCHAR(10)   -- NS/1H/HT/2H/ET/P/FT/AET/PEN
  ElapsedMinutes  INT NULL
  HomeGoals       INT NULL
  AwayGoals       INT NULL
  ExtraTimeHomeGoals  INT NULL
  ExtraTimeAwayGoals  INT NULL
  PenaltyHomeGoals    INT NULL
  PenaltyAwayGoals    INT NULL
  Round           NVARCHAR(50)
  LineupsAvailable BOOL DEFAULT false
  IsFinished      BOOL DEFAULT false
  LastSyncedAt    DATETIME

-- Confirmed lineups (available ~1h before, fetched 30min before)
MatchLineupPlayers
  Id          INT PK AUTOINCREMENT
  MatchId     INT FK → Matches
  TeamId      INT FK → Teams
  PlayerId    INT FK → Players
  IsStarting  BOOL
  Position    CHAR(1)  -- G/D/M/F (from lineup, may differ from squad position)
  ShirtNumber INT

-- Goals scored in a match (for scoring calculation)
MatchGoals
  Id              INT PK AUTOINCREMENT
  MatchId         INT FK → Matches
  ScorerPlayerId  INT NULL FK → Players  -- null for own goals
  TeamId          INT FK → Teams
  Minute          INT
  ExtraMinute     INT NULL
  GoalType        NVARCHAR(20)  -- "Normal Goal"|"Penalty"|"Own Goal"
  ApiEventOrder   INT  -- order of event in response, for deduplication

-- User prediction per match per group
Predictions
  Id              UNIQUEIDENTIFIER PK DEFAULT NEWID()
  UserId          INT FK → Users
  MatchId         INT FK → Matches
  GroupId         INT FK → Groups
  HomeGoals       INT
  AwayGoals       INT
  CreatedAt       DATETIME
  UpdatedAt       DATETIME
  IsScored        BOOL DEFAULT false  -- scoring has been calculated
  UNIQUE (UserId, MatchId, GroupId)

-- Which players user predicts to score (linked to a prediction)
GoalscorerPredictions
  Id              INT PK AUTOINCREMENT
  PredictionId    UNIQUEIDENTIFIER FK → Predictions
  PlayerId        INT FK → Players

-- Calculated scores per prediction (populated after match ends)
PredictionScores
  Id                  INT PK AUTOINCREMENT
  PredictionId        UNIQUEIDENTIFIER FK → Predictions
  UserId              INT FK → Users
  MatchId             INT FK → Matches
  GroupId             INT FK → Groups
  ExactScorePoints    INT DEFAULT 0   -- 7 or 0
  OutcomePoints       INT DEFAULT 0   -- 2 or 0 (mutually exclusive with exact)
  GoalscorerPoints    INT DEFAULT 0   -- sum of scorer point rewards
  TotalPoints         INT DEFAULT 0   -- sum of above
  CalculatedAt        DATETIME
  UNIQUE (PredictionId)
```

---

## Scoring Engine

```
Given: Prediction(homeGoals=2, awayGoals=1), GoalscorerPredictions=[PlayerId=X]
Given: Match result: Home 2-1 Away, Goals by PlayerX (Defender), PlayerY (Forward)

1. Exact score check:
   prediction.homeGoals == match.homeGoals && prediction.awayGoals == match.awayGoals
   → true → ExactScorePoints = 7, OutcomePoints = 0

2. Outcome check (only if exact score missed):
   outcome(prediction) == outcome(match)
   outcome = sign(homeGoals - awayGoals): positive=home win, 0=draw, negative=away win
   → OutcomePoints = 2 (or 0)

3. Goalscorer check:
   For each PlayerId in GoalscorerPredictions:
     Find matching MatchGoal where ScorerPlayerId == PlayerId
       AND GoalType IN ("Normal Goal", "Penalty")
     If found:
       Look up Player.Position:
         Goalkeeper → +4
         Defender   → +4
         Midfielder → +2
         Attacker   → +1
   GoalscorerPoints = sum of all matched scorer rewards

4. TotalPoints = ExactScorePoints + OutcomePoints + GoalscorerPoints
```

**Important**: Exact score (7pts) and outcome (2pts) are mutually exclusive.
Goalscorer points always stack on top.

---

## Background Jobs

### Architecture: Single `MatchSchedulerService` (BackgroundService)

Runs every **60 seconds**. Checks DB for what needs to happen. No external scheduler needed.

```
Every 60s:
  1. LINEUP SYNC
     Find matches where:
       Status == "NS"
       AND KickoffUtc <= NOW + 35min
       AND KickoffUtc > NOW - 5min  (not yet started)
       AND LineupsAvailable == false
     For each: call GET /fixtures/lineups?fixture={id}, store results, set LineupsAvailable=true
     API cost: 1 call per match (max ~8 concurrent on busy days)

  2. LIVE POLL
     Find matches where:
       Status IN ("1H", "HT", "2H", "ET", "P")
     For each: call GET /fixtures/events?fixture={id}&type=Goal
               call GET /fixtures?id={id} (for status update)
     Upsert goals (deduplicate by ApiEventOrder)
     Update Match.Status, Match.HomeGoals, Match.AwayGoals, Match.ElapsedMinutes
     API cost: 2 calls per live match per minute
     (3-min effective poll rate: skip if LastSyncedAt > NOW - 3min)

  3. FINALIZE
     Find matches where:
       Status IN ("FT", "AET", "PEN")
       AND IsFinished == false
     For each: calculate PredictionScores for all Predictions of this match
     Set Match.IsFinished = true
     API cost: 0 (uses local data)

  4. DAILY FIXTURE SYNC
     Once per day (check if last sync > 23h ago):
     Call GET /fixtures?league=1&season=2026
     Upsert all 104 fixtures (status, scores, kickoff times)
     API cost: 1 call/day
```

### API Budget Projection (busy group stage day: 8 matches)

| Job | Calls |
|---|---|
| Daily fixture sync | 1 |
| Lineup sync (8 matches) | 8 |
| Live poll: 2 calls × 8 matches × 30 polls (every 3min × 90min) | 480 |
| **Total** | **~489 / 7500** |

---

## API Endpoints to Implement

### Admin / Sync
```
POST /api/admin/sync-teams-players     → Trigger one-time squad sync (48 API calls)
POST /api/admin/sync-fixtures          → Manual fixture refresh
```

### Matches
```
GET  /api/matches?groupId={id}         → All WC matches with user's prediction status for group
GET  /api/matches/{id}                 → Single match detail + lineups (if available)
GET  /api/matches/{id}/predictions?groupId={id}
     → After kickoff: all group members' predictions + live scores
```

### Predictions
```
GET  /api/predictions?matchId={id}&groupId={id}   → User's own prediction for this match/group
POST /api/predictions                              → Create/update prediction
     Body: { matchId, groupId, homeGoals, awayGoals, goalscorerPlayerIds: [int] }
     Rules: reject if match.KickoffUtc <= UTC.Now
```

### Leaderboard
```
GET  /api/groups/{id}/leaderboard      → Total points per user in group (all finished matches)
GET  /api/groups/{id}/leaderboard/match/{matchId}
     → Live leaderboard for one specific match (projected points)
```

---

## Frontend Pages

### MatchesPage (`/groups/:id/matches`)
- List of all 104 matches grouped by Round
- Each match card shows:
  - Teams + kickoff time (user's local timezone)
  - User's prediction (if placed): "2-1"
  - Status badge: PRED / LOCKED / LIVE / FT
  - Points earned (after FT)

### PredictionModal
- Score input: two number inputs (home/away goals)
- Player picker: searchable list filtered to both teams' squads
  - If lineups available: show starting XI separately
  - Position shown next to player name with point value (D=4pts, M=2pts, F=1pt)
  - Multi-select (no hard limit, but UX discourages spam)
- Save/update button (disabled if match started)

### MatchDetailPage (`/groups/:id/matches/:matchId`)
- Pre-kickoff: show own prediction form + players from both squads
- Post-kickoff / live:
  - Live score banner
  - Elapsed time
  - Goals timeline
  - Table of all group members' predictions with current projected points
  - Live refresh every 30s (poll `/matches/{id}/predictions?groupId={id}`)

### LeaderboardPage (`/groups/:id/leaderboard`)
- Total points ranking for the group
- Expandable rows showing points per match

---

## Implementation Order

1. **DB migrations** — all new tables
2. **ApiFootballClient** — typed HTTP client, config, rate limit logging
3. **SyncTeamsAndPlayers** — endpoint + service (48 squads)
4. **SyncFixtures** — endpoint + service (104 matches)
5. **Predictions CRUD** — create/update with lock check
6. **MatchSchedulerService** — background job (lineup + live poll + finalize)
7. **ScoringEngine** — calculate PredictionScores
8. **Query endpoints** — matches list, predictions view, leaderboard
9. **Frontend** — MatchesPage, PredictionModal, MatchDetailPage, LeaderboardPage

---

## Configuration (appsettings.Development.json)

```json
"ApiFootball": {
  "ApiKey": "YOUR_KEY_HERE",
  "BaseUrl": "https://v3.football.api-sports.io",
  "LeagueId": 1,
  "Season": 2026
}
```

---

## Open Questions / Risks

| Risk | Mitigation |
|---|---|
| Events/lineups unavailable on free plan | Test first call when tournament starts; fall back to squad list for player picker |
| Own goals from player in squad | Filter: only "Normal Goal" + "Penalty" count for scorer rewards |
| Multiple goals by same player | Each goal event is independent — scorer prediction counts once per goal matched |
| Penalty shootout goals | `score.penalty` used for display; regular goals (90+ET) used for scoring |
| Match postponed mid-prediction | Keep predictions; recalculate if rescheduled; cancel score if CANC |
| API downtime during live match | Retry with exponential backoff; last known state persisted in DB |
