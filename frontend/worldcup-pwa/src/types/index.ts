export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isAdmin?: boolean
  emailVerified?: boolean
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

export interface GroupPreview {
  id: string
  name: string
  memberCount: number
}

export interface AuthResponse {
  token: string
  user: User
}

// Matches
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
  myPrediction: MyPrediction | null
}

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

export interface MatchDetail extends MatchListItem {
  lineup: LineupPlayer[]
  goals: GoalEvent[]
  cards: CardEvent[]
  substitutions: SubstitutionEvent[]
  varDecisions: VarDecisionEvent[]
  lineupsRevealed: boolean
  lineupRevealUtc: string
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

// Predictions
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

export interface MemberPrediction {
  userId: string
  firstName: string
  lastName: string
  predHome: number
  predAway: number
  scorers: ScorerPick[]
  cards: CardPick[]
  projectedPoints: number
}

export interface GroupPredictions {
  matchId: number
  status: string
  homeGoals: number | null
  awayGoals: number | null
  predictions: MemberPrediction[]
}

// Leaderboard
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

// Teams / Tournament
export interface TeamInfo {
  id: number
  name: string
  code: string
  country: string
  logoUrl: string
}

export interface Player {
  id: number
  name: string
  shirtNumber: number
  position: string
  photoUrl: string
  age: number
}

export interface PlayerStats {
  playerId: number
  name: string
  firstname: string | null
  lastname: string | null
  age: number | null
  birthDate: string | null
  birthPlace: string | null
  birthCountry: string | null
  nationality: string | null
  height: string | null
  weight: string | null
  injured: boolean
  photoUrl: string
  teamName: string
  teamCode: string
  appearances: number | null
  lineups: number | null
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
  yellowRed: number | null
  red: number | null
  foulsDrawn: number | null
  foulsCommitted: number | null
  hasApiData: boolean
}

export interface TeamSquad {
  team: { id: number; name: string; code: string; logoUrl: string }
  players: Player[]
}

// ── Tournament (standings + team detail) ──────────────────────
export interface StandingRow {
  teamId: number
  teamName: string
  teamCode: string
  logoUrl: string
  groupName: string
  rank: number
  points: number
  goalsDiff: number
  played: number
  win: number
  draw: number
  lose: number
  goalsFor: number
  goalsAgainst: number
  form: string
  description: string
}

export interface StandingGroup {
  groupName: string
  rows: StandingRow[]
}

export interface TeamStats {
  form: string
  played: number
  wins: number
  draws: number
  loses: number
  goalsFor: number | null
  goalsAgainst: number | null
  cleanSheets: number
  failedToScore: number
  penaltyScored: number
  penaltyMissed: number
  yellowCards: number
  redCards: number
  formation: string | null
  updatedAt: string
}

export interface TeamMatch {
  id: number
  kickoffUtc: string
  status: string
  round: string
  opponent: TeamSummary
  isHome: boolean
  teamGoals: number | null
  opponentGoals: number | null
}

export interface TeamDetail {
  team: TeamSummary
  country: string | null
  standing: StandingRow | null
  stats: TeamStats | null
  matches: TeamMatch[]
}

export interface TopScorer {
  playerId: number
  name: string
  photoUrl: string
  nationality: string
  teamId: number
  teamName: string
  teamLogo: string
  goals: number
  assists: number
  appearances: number
  minutes: number
  penaltiesScored: number
  rank: number
}

// Scoring rules
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
  cardPredictionMode: CardPredictionMode
  wrongPickPenalty: number
  isLocked: boolean
  canEdit: boolean
}

// Prediction input/rehydration (from GET /predictions/my)
export interface ScorerPickInput { playerId: number; goalType: string }
export interface CardPickInput { playerId: number; kind: string }

export interface PredictionResult {
  id: string
  matchId: number
  groupId: string
  homeGoals: number
  awayGoals: number
  scorers: ScorerPickInput[]
  cards: CardPickInput[]
  updatedAt: string
}
