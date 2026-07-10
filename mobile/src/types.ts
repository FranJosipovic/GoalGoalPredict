// Subset of the PWA's shared types, ported for the mobile app.
// Extend as we add screens (matches, leaderboard, tournament...).

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isAdmin?: boolean
  emailVerified?: boolean
  hasOnboarded?: boolean
  preferredLanguage?: string | null
}

export interface Group {
  id: string
  name: string
  inviteCode: string
  createdByUserId: string
  createdAt: string
  isGlobal: boolean
  isLocked: boolean
}

export interface GroupMember {
  userId: string
  firstName: string
  lastName: string
  email: string
  role: 'Owner' | 'Member'
}

export interface GroupDetail extends Group {
  members: GroupMember[]
}

export interface LeaderboardEntry {
  userId: string
  firstName: string
  lastName: string
  totalPoints: number
  exactScores: number
  correctOutcomes: number
  goalscorerPoints: number
  position: number
}

// ── Picks ────────────────────────────────────────────────
export type FinishType = 'Regular' | 'ExtraTime' | 'Penalties'

export interface ScorerPick {
  playerId: number
  name: string
  position: string
  goalType: string
  teamId: number
  pointsAwarded: number
}

export interface CardPick {
  playerId: number
  name: string
  kind: string
  teamId: number
  pointsAwarded: number
}

export interface MyPredictionItem {
  matchId: number
  round: string
  kickoffUtc: string
  status: string
  homeTeam: TeamSummary
  awayTeam: TeamSummary
  actualHome: number | null
  actualAway: number | null
  predHome: number
  predAway: number
  scorers: ScorerPick[]
  cards: CardPick[]
  points: number | null
  projectedPoints: number
  isScored: boolean
}

export interface MemberPrediction {
  userId: string
  firstName: string
  lastName: string
  predHome: number
  predAway: number
  scorers: ScorerPick[]
  cards: CardPick[]
  projectedPoints: number
  finishType: FinishType | null
}

export interface GroupPredictions {
  matchId: number
  status: string
  homeGoals: number | null
  awayGoals: number | null
  predictions: MemberPrediction[]
}

// ── Match detail (events, lineups) ───────────────────────
export interface LineupPlayer {
  playerId: number
  name: string
  position: string
  shirtNumber: number
  isStarting: boolean
  teamId: number
  photoUrl: string
}

export interface GoalEvent {
  minute: number
  extraMinute: number | null
  scorerPlayerId: number | null
  scorerName: string | null
  teamId: number
  goalType: string
}

export interface CardEvent {
  minute: number
  extraMinute: number | null
  playerId: number | null
  playerName: string | null
  teamId: number
  cardType: string
}

export interface SubstitutionEvent {
  minute: number
  extraMinute: number | null
  teamId: number
  playerInId: number | null
  playerInName: string | null
  playerOutId: number | null
  playerOutName: string | null
}

export interface VarDecisionEvent {
  minute: number
  extraMinute: number | null
  teamId: number
  playerId: number | null
  playerName: string | null
  detail: string
}

export interface ShootoutPenalty {
  teamId: number
  playerId: number | null
  playerName: string | null
  scored: boolean
  order: number
}

export interface MatchDetail extends MatchListItem {
  lineup: LineupPlayer[]
  goals: GoalEvent[]
  cards: CardEvent[]
  substitutions: SubstitutionEvent[]
  varDecisions: VarDecisionEvent[]
  shootoutPenalties: ShootoutPenalty[]
  penaltyHomeGoals: number | null
  penaltyAwayGoals: number | null
  lineupsRevealed: boolean
  lineupRevealUtc: string
}

// ── Tournament (standings + teams) — for the knockout bracket ──
export interface StandingRow {
  teamId: number
  teamName: string
  teamCode: string
  logoUrl: string
  groupName: string
  rank: number
}

export interface StandingGroup {
  groupName: string
  rows: StandingRow[]
}

export interface TeamInfo {
  id: number
  name: string
  code: string
  country: string
  logoUrl: string
}

export interface PlayerStats {
  playerId: number
  name: string
  firstname: string | null
  lastname: string | null
  age: number | null
  nationality: string | null
  height: string | null
  weight: string | null
  injured: boolean
  photoUrl: string
  teamName: string
  teamCode: string
  appearances: number | null
  minutes: number | null
  number: number | null
  position: string | null
  rating: string | null
  captain: boolean
  goals: number | null
  conceded: number | null
  assists: number | null
  saves: number | null
  yellow: number | null
  red: number | null
  foulsDrawn: number | null
  foulsCommitted: number | null
  hasApiData: boolean
}

// ── Squads & prediction input ────────────────────────────
export interface Player {
  id: number
  name: string
  shirtNumber: number
  position: string
  photoUrl: string
  age: number
}

export interface TeamSquad {
  team: { id: number; name: string; code: string; logoUrl: string }
  players: Player[]
}

export interface ScorerPickInput {
  playerId: number
  goalType: string
}
export interface CardPickInput {
  playerId: number
  kind: string
}

export interface PredictionResult {
  id: string
  matchId: number
  groupId: string
  homeGoals: number
  awayGoals: number
  scorers: ScorerPickInput[]
  cards: CardPickInput[]
  updatedAt: string
  finishType: FinishType | null
}

// ── Scoring rules ────────────────────────────────────────
export type CardPredictionMode = 'Limited' | 'Single' | 'Net'

export interface GroupScoringRules {
  exactScoreEnabled: boolean
  exactScorePoints: number
  outcomeEnabled: boolean
  outcomePoints: number
  goalscorerEnabled: boolean
  scorerGkPoints: number
  scorerDefPoints: number
  scorerMidPoints: number
  scorerAttPoints: number
  ownGoalEnabled: boolean
  ownGoalPoints: number
  yellowCardEnabled: boolean
  yellowCardPoints: number
  yellowCardMaxPicks: number
  redCardEnabled: boolean
  redCardPoints: number
  redCardMaxPicks: number
  missedPenaltyEnabled: boolean
  missedPenaltyPoints: number
  missedPenaltyMaxPicks: number
  finishTypeEnabled: boolean
  finishTypePoints: number
  cardPredictionMode: CardPredictionMode
  wrongPickPenalty: number
  isLocked: boolean
  canEdit: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

// ── Matches ──────────────────────────────────────────────
export interface TeamSummary {
  id: number
  name: string
  code: string
  logoUrl: string
}

export interface MyPrediction {
  id: string
  homeGoals: number
  awayGoals: number
  goalscorerPlayerIds: number[]
  totalPoints: number | null
}

export interface MatchListItem {
  id: number
  round: string
  kickoffUtc: string
  status: string
  elapsedMinutes: number | null
  homeTeam: TeamSummary
  awayTeam: TeamSummary
  homeGoals: number | null
  awayGoals: number | null
  penaltyHomeGoals?: number | null
  penaltyAwayGoals?: number | null
  myPrediction: MyPrediction | null
}
