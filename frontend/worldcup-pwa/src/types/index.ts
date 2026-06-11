export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isAdmin?: boolean
}

export interface Group {
  id: string
  name: string
  inviteCode: string
  createdByUserId: string
  createdAt: string
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

export interface MatchDetail extends MatchListItem {
  lineup: LineupPlayer[]
  goals: GoalEvent[]
  cards: CardEvent[]
  substitutions: SubstitutionEvent[]
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

export interface TeamSquad {
  team: { id: number; name: string; code: string; logoUrl: string }
  players: Player[]
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
