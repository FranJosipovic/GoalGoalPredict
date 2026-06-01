# Step 3 — Admin Panel & Match Simulation

## Concept

Admin pre-programs an entire simulated match upfront (teams, lineups, goal events).
At kickoff, a background job fires and replays the match in real-time over 90 minutes,
processing events chronologically every 3 minutes — identical to live WC polling.
The mobile app polls `/matches/{id}/predictions` and receives push notifications on significant events.

---

## Admin Decisions

- **Auth**: Predefined admin emails in `appsettings.json` → `Admin:Emails: ["you@email.com"]`
- **UI**: Desktop-only web panel inside existing React app (`/admin/*` routes)
- **Sim group**: Normal Group with `IsSimulation = true`; users join via invite code as usual
- **Sim matches**: Bound to one simulation group, don't appear in other groups

---

## New DB Schema

### Extensions to existing tables

```sql
-- users: add admin flag
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- groups: add simulation flag
ALTER TABLE groups ADD COLUMN is_simulation BOOLEAN DEFAULT FALSE;

-- matches: extend for simulation
ALTER TABLE matches
  ADD COLUMN source VARCHAR(20) DEFAULT 'ApiFootball',      -- 'ApiFootball' | 'Simulation'
  ADD COLUMN simulation_group_id UUID REFERENCES groups(id); -- null for real WC matches
```

### New tables

```sql
-- Pre-programmed goal events for simulation matches
SimulationEvents
  Id                INT PK AUTOINCREMENT
  MatchId           INT FK → Matches
  PlayerId          INT FK → Players
  TeamId            INT FK → Teams (which team is credited)
  Minute            INT
  GoalType          VARCHAR(20)   -- 'Normal Goal' | 'Penalty' | 'Own Goal'
  IsProcessed       BOOL DEFAULT FALSE
  ProcessedAt       DATETIME NULL

-- Web Push subscriptions (for push notifications)
PushSubscriptions
  Id                INT PK AUTOINCREMENT
  UserId            UUID FK → Users
  Endpoint          TEXT
  P256dh            TEXT          -- VAPID public key
  Auth              TEXT          -- VAPID auth secret
  CreatedAt         DATETIME
  UNIQUE(UserId, Endpoint)        -- one subscription per device per user
```

### Match entity extensions

```
Match.Source          → "ApiFootball" (default) or "Simulation"
Match.SimulationGroupId → FK to Group (null for real WC)
```

A simulation match only appears in `GetMatches(groupId)` when:
```
match.Source == "ApiFootball"
OR (match.Source == "Simulation" AND match.SimulationGroupId == groupId)
```

---

## Simulation Match Lifecycle

### 1. Admin creates match (one-time, complete)

Admin fills in:
- Home team, Away team
- Kickoff time (any future datetime)
- Home lineup: formation (e.g. 4-3-3) + player per slot
- Away lineup: formation + player per slot
- Goal events: list of { PlayerId, Minute, GoalType }
- Final score is derived from the goal events automatically

System:
- Creates `Match` (Source=Simulation, SimulationGroupId=selected group, Status=NS)
- Creates `MatchLineupPlayers` for both teams
- Creates `SimulationEvents` for all goal events
- Scheduler picks it up automatically at kickoff

### 2. At kickoff — automatic progression

`MatchSchedulerService` detects `Status == "NS" AND KickoffUtc <= now` for sim matches.
Instead of calling API, it triggers `SimulateMatchStep`:

```
Every 60s for each live sim match:
  elapsedMinutes = (UtcNow - KickoffUtc).TotalMinutes

  Match status:
    0–44  → "1H"  (1st half)
    45    → "HT"  (halftime, pause ~15 min real time → skip to 45+)
    46–89 → "2H"  (2nd half)
    90+   → "FT"  → trigger FinalizeMatch

  Process unprocessed events where event.Minute <= elapsedMinutes:
    → Insert MatchGoal (same as real live polling)
    → Send push notification: "⚽ [PlayerName] [Minute]' — [Home] X:Y [Away]"

  On status change:
    → "1H" push: "🏈 Match started: [Home] vs [Away]"
    → "HT" push: "⏸ Half time: [Home] X:Y [Away]"
    → "FT" push: "🏁 Full time: [Home] X:Y [Away]"
    → FT: call FinalizeMatch → score calculation + leaderboard update
```

### 3. Mobile app

- Polling: same `/api/matches/{id}/predictions?groupId=` every 30s when page open
- Push: received even when app is closed (via Service Worker)

---

## Push Notifications — Architecture

### Stack
- **Web Push API** (standard browser API, works in PWA)
- **VAPID** (Voluntary Application Server Identification)
- No third-party service needed (Firebase not required)

### Flow
```
1. App generates subscription via browser: PushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY })
2. App sends subscription (endpoint + keys) to backend: POST /api/push/subscribe
3. Backend stores in PushSubscriptions table
4. When event occurs: backend calls web-push library with payload
5. Browser receives notification even if app is closed (service worker handles it)
```

### Backend
- NuGet: `WebPush` package
- Config: `Push:VapidPublicKey`, `Push:VapidPrivateKey`, `Push:Subject`
- `PushNotificationService` sends to all subscriptions for a userId (or group)

### Frontend (Service Worker)
- vite-plugin-pwa generates SW → add push event listener
- `self.addEventListener('push', ...)` → `self.registration.showNotification(...)`
- Click on notification → navigate to match

---

## Formation Visual Component

### Reusable `<FormationPitch>` component

```
Props:
  formation: string           // "4-3-3", "4-4-2", "3-5-2", etc.
  homePlayers: PlayerSlot[]   // [{ position, player | null }]
  awayPlayers: PlayerSlot[]
  mode: 'view' | 'edit'
  onSlotClick?: (slot) => void  // admin edit mode only
  side: 'home' | 'away' | 'both'
```

### Pitch layout (vertical, bottom = own goal)

```
Formation 4-3-3:
  Row 4 (attack):  [ F ] [ F ] [ F ]
  Row 3 (mid):     [ M ] [ M ] [ M ]
  Row 2 (def):   [D] [D] [D] [D]
  Row 1 (gk):       [    GK    ]
```

Each slot = circle with player name/initials + shirt number.
Colors by position: GK=blue, DEF=teal, MID=yellow, ATT=red (same as squad badges).

In **edit mode** (admin): click slot → player dropdown (filtered by position).
In **view mode** (user): just displays names, no interaction.

### Formation parsing

```typescript
const FORMATIONS: Record<string, number[][]> = {
  "4-3-3": [[1], [4], [3], [3]],   // [row1_gk, row2_def, row3_mid, row4_fwd]
  "4-4-2": [[1], [4], [4], [2]],
  "4-2-3-1": [[1], [4], [2], [3], [1]],
  "3-5-2": [[1], [3], [5], [2]],
  "5-3-2": [[1], [5], [3], [2]],
  "5-4-1": [[1], [5], [4], [1]],
  "3-4-3": [[1], [3], [4], [3]],
}
```

Row positions map to player positions:
- Row 1: Goalkeeper
- Row 2: Defender
- Row 3 (middle rows): Midfielder
- Last row: Attacker

---

## Admin Panel — Pages & Routes

All under `/admin/*`, accessible only if `user.isAdmin === true`.

### 1. `/admin` — Dashboard
- Stats: total groups, sim groups, sim matches, real WC matches
- Quick links to all sections

### 2. `/admin/groups` — Simulation Leagues
- List all groups with `is_simulation = true`
- Create new sim group (name → gets invite code)
- View members of each group

### 3. `/admin/matches` — Simulation Matches
- List all sim matches (per sim group)
- Status badges (NS / 1H / HT / 2H / FT)
- Link to create new sim match

### 4. `/admin/matches/new` — Create Simulation Match
Multi-step form:

**Step 1 — Match Info**
- Select sim group (dropdown)
- Select home team (all 48 teams)
- Select away team
- Kickoff datetime picker

**Step 2 — Home Lineup**
- Formation selector (pill buttons: 4-3-3, 4-4-2, etc.)
- Visual FormationPitch (edit mode) — click each slot, select player from team

**Step 3 — Away Lineup**
- Same as Step 2 for away team

**Step 4 — Goal Events**
- Timeline builder:
  - Add event: [Minute input] [Team selector] [Player dropdown] [Type: Normal/Penalty/OwnGoal]
  - Preview: sorted timeline of all goals
  - Auto-calculates final score from events

**Step 5 — Confirm & Create**
- Summary card showing everything
- "Create Match" → POST to backend → redirect to match list

### 5. `/admin/matches/:id` — Match Detail (admin view)
- Full match info
- Lineup visual (view mode)
- Events timeline
- Current status + projected progression
- Manual override: "Force Status" button (for testing edge cases)

---

## New Backend Endpoints

### Admin
```
POST /api/admin/sim-groups               → Create simulation group
GET  /api/admin/sim-groups               → List sim groups

POST /api/admin/sim-matches              → Create sim match (full payload)
GET  /api/admin/sim-matches?groupId=     → List sim matches
GET  /api/admin/sim-matches/:id          → Sim match detail
PUT  /api/admin/sim-matches/:id/status   → Force status override (testing)
```

### Create sim match payload
```json
{
  "groupId": "uuid",
  "homeTeamId": 16,
  "awayTeamId": 6,
  "kickoffUtc": "2026-06-15T18:00:00Z",
  "homeFormation": "4-3-3",
  "awayFormation": "4-4-2",
  "homeLineup": [
    { "playerId": 1305, "position": "G", "shirtNumber": 1 },
    ...
  ],
  "awayLineup": [...],
  "events": [
    { "playerId": 726, "teamId": 3, "minute": 23, "goalType": "Normal Goal" },
    { "playerId": 2887, "teamId": 6, "minute": 67, "goalType": "Penalty" }
  ]
}
```

### Push
```
POST /api/push/subscribe    → Save push subscription { endpoint, p256dh, auth }
DELETE /api/push/subscribe  → Remove subscription (logout/unsubscribe)
```

---

## Implementation Order

### Backend
1. DB migration — add columns + new tables
2. `IsAdmin` middleware/attribute for admin routes
3. `CreateSimulationMatch` use case
4. `SimulateMatchStep` use case (called by scheduler instead of `PollLiveMatch`)
5. Extend `MatchSchedulerService` to handle sim matches
6. Push notification service (VAPID setup + WebPush NuGet)
7. Admin endpoints + `PushController`

### Frontend
1. Admin auth guard (check `user.isAdmin`)
2. `FormationPitch` reusable component (edit + view modes)
3. Admin dashboard layout (desktop-optimized)
4. Sim group management page
5. Create match multi-step form (4 steps + confirm)
6. Admin match list/detail
7. Push subscription setup in PWA
8. Service worker push event handler

---

## Config additions (appsettings.json)

```json
"Admin": {
  "Emails": ["your@email.com"]
},
"Push": {
  "VapidPublicKey": "generated_public_key",
  "VapidPrivateKey": "generated_private_key",
  "Subject": "mailto:your@email.com"
}
```

Generate VAPID keys via:
```bash
npx web-push generate-vapid-keys
```

---

## Open Questions / Risks

| Risk | Mitigation |
|---|---|
| Browser push permission denied | Graceful degradation — app works without push |
| Sim match events fire during server restart | `IsProcessed` flag prevents double-processing |
| Admin accidentally creates duplicate sim match | Warn if same teams + same kickoff exists |
| Formation doesn't cover all squad positions | Only starters matter; position enum maps row → G/D/M/F |
| VAPID key rotation | Store keys in config, not DB; rotation requires re-subscription |
