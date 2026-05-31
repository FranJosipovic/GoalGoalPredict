# Step 1 — Auth, Groups & PWA Shell

## Goal
Get the app running on your phone with:
- User registration & login (JWT)
- Group (competition) creation and joining
- React PWA installable on Android/iOS

---

## Project Structure

```
WorldCupApp/
├── backend/
│   ├── WorldCupApp.API/              ← entry point, controllers, middleware
│   ├── WorldCupApp.Application/      ← use cases, DTOs, interfaces
│   ├── WorldCupApp.Domain/           ← entities, domain logic, no dependencies
│   └── WorldCupApp.Infrastructure/   ← EF Core, PostgreSQL, JWT, repos
└── frontend/
    └── worldcup-pwa/                 ← React + TypeScript + Vite PWA
```

---

## Backend

### 1. Domain Layer (`WorldCupApp.Domain`)

**Entities — no EF, no external packages, pure C#:**

```
Entities/
  User.cs           id, email, firstName, lastName, passwordHash, createdAt
  Group.cs          id, name, inviteCode, createdByUserId, createdAt
  GroupMember.cs    id, groupId, userId, joinedAt, role (Owner/Member)
```

**Rules to encode in domain:**
- `InviteCode` on `Group` is a random 6-char alphanumeric string, generated at creation
- A user can belong to multiple groups
- Only the group Owner can delete the group

---

### 2. Application Layer (`WorldCupApp.Application`)

**Interfaces (implemented by Infrastructure):**
```
Interfaces/
  IUserRepository.cs
  IGroupRepository.cs
  ITokenService.cs          ← GenerateToken(User)
  IPasswordHasher.cs        ← Hash(plain), Verify(plain, hash)
```

**Use cases (one class per action):**
```
UseCases/
  Auth/
    RegisterUser.cs         ← validate, hash password, save user, return JWT
    LoginUser.cs            ← find by email, verify hash, return JWT
  Groups/
    CreateGroup.cs          ← create group, add creator as Owner member
    JoinGroup.cs            ← find group by inviteCode, add user as Member
    GetMyGroups.cs          ← return all groups for current user
```

**DTOs live here too** — inputs and outputs for each use case.

---

### 3. Infrastructure Layer (`WorldCupApp.Infrastructure`)

**Packages:**
```
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package BCrypt.Net-Next
```

**AppDbContext** — configure all entity mappings here with Fluent API.

**Repositories** — implement the interfaces from Application.

**Migrations:**
```bash
dotnet ef migrations add InitialCreate --project Infrastructure --startup-project API
dotnet ef database update --project Infrastructure --startup-project API
```

**PostgreSQL schema (what EF will generate):**
```sql
users         (id, email, first_name, last_name, password_hash, created_at)
groups        (id, name, invite_code, created_by_user_id, created_at)
group_members (id, group_id, user_id, role, joined_at)
```

---

### 4. API Layer (`WorldCupApp.API`)

**Controllers:**
```
AuthController
  POST /api/auth/register    { email, firstName, lastName, password }  → { token, user }
  POST /api/auth/login       { email, password }               → { token, user }
  GET  /api/auth/me          [Authorize]                       → { user }

GroupsController  [Authorize on all]
  POST /api/groups           { name }           → group + inviteCode
  POST /api/groups/join      { inviteCode }     → group
  GET  /api/groups           →  list of user's groups
  GET  /api/groups/{id}      →  group detail + members
```

**`Program.cs` setup checklist:**
- Add JWT authentication with `AddAuthentication().AddJwtBearer()`
- Add CORS — allow your frontend origin
- Add Swagger for testing during dev
- Register all use cases and repos with DI
- Add `UseHttpsRedirection`

**JWT config in `appsettings.json`:**
```json
{
  "Jwt": {
    "Key": "your-secret-key-min-32-chars",
    "Issuer": "WorldCupApp",
    "Audience": "WorldCupApp",
    "ExpiryHours": 72
  },
  "ConnectionStrings": {
    "Default": "Host=localhost;Database=worldcup;Username=postgres;Password=yourpassword"
  }
}
```

---

## Frontend (React PWA)

### Setup

```bash
npm create vite@latest worldcup-pwa -- --template react-ts
cd worldcup-pwa
npm install
npm install @vitejs/plugin-pwa
npm install axios react-router-dom
```

**`vite.config.ts`** — add PWA plugin:
```ts
import { VitePWA } from '@vitejs/plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'World Cup Predictions',
        short_name: 'WC Predict',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
```

> Add `icon-192.png` and `icon-512.png` to `/public` — any football icon works for now.

### Folder Structure

```
src/
  api/
    client.ts         ← axios instance with base URL + JWT interceptor
    auth.ts           ← register, login, getMe
    groups.ts         ← createGroup, joinGroup, getGroups
  components/
    ProtectedRoute.tsx
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    GroupsPage.tsx    ← list groups + create/join buttons
    GroupDetailPage.tsx
  store/
    authStore.ts      ← store JWT + user in localStorage (zustand or Context)
  App.tsx             ← router setup
```

**`client.ts` — axios with auto JWT header:**
```ts
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL
})

client.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default client
```

**`.env.local`:**
```
VITE_API_URL=https://your-local-ip:7001/api
```

---

## Running on Your Phone (Local Network)

### Backend

```bash
# In launchSettings.json, set applicationUrl to bind on all interfaces:
"applicationUrl": "https://0.0.0.0:7001;http://0.0.0.0:5001"
```

Or run with:
```bash
dotnet run --urls "https://0.0.0.0:7001"
```

For HTTPS on local network your phone will complain about the cert.
Two options:
- **Option A (easier):** Use HTTP only on local (`http://0.0.0.0:5001`) during dev
- **Option B (proper):** Trust the .NET dev cert — harder on mobile, skip for now

### Frontend

```bash
npm run dev -- --host
# Vite will show: Local: http://192.168.x.x:5173
```

Open that IP on your phone browser. You should see an "Add to Home Screen" prompt — that's the PWA install.

**Your phone and laptop must be on the same WiFi.**

---

## Build Order (do in this order)

1. `Domain` — entities only, zero dependencies
2. `Application` — interfaces + use cases, depends on Domain only
3. `Infrastructure` — EF, repos, JWT, BCrypt, depends on Application + Domain
4. `API` — wire everything up, depends on all layers
5. `Frontend` — build against running API

---

## What's NOT in Step 1

These come in Step 2+:
- Match sync from api-football
- Predictions
- Scoring engine
- Leaderboard
- Push notifications / SignalR

---

## Quick Checklist Before Moving to Step 2

- [ ] Can register a new user and get a JWT back
- [ ] Can login and hit `/api/auth/me` successfully
- [ ] Can create a group and get back an invite code
- [ ] Can join a group using the invite code from another account
- [ ] React app loads on phone browser via local IP
- [ ] PWA "Add to Home Screen" works on phone
- [ ] Protected routes redirect to login when no token
