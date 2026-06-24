import client from './client'
import type { TeamSummary, GroupScoringRules, ScorerPickInput, CardPickInput } from '../types'

export interface GuestPlayer {
  id: number
  name: string
  shirtNumber: number
  position: string
  photoUrl: string
}

export interface GuestMatch {
  id: number
  kickoffUtc: string
  status: string
  round: string
  homeTeam: TeamSummary
  awayTeam: TeamSummary
}

export interface GuestNextMatch {
  match: GuestMatch
  rules: GroupScoringRules
  homePlayers: GuestPlayer[]
  awayPlayers: GuestPlayer[]
}

export interface GuestPredictPayload {
  email: string
  matchId: number
  homeGoals: number
  awayGoals: number
  scorers: ScorerPickInput[]
  cards: CardPickInput[]
}

export const getGuestNextMatch = () =>
  client.get<GuestNextMatch>('/guest/next-match').then(r => r.data)

export const submitGuestPrediction = (payload: GuestPredictPayload) =>
  client.post<{ message: string }>('/guest/predict', payload).then(r => r.data)
