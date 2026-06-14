import client from './client'
import type { StandingGroup, TeamDetail, TopScorer } from '../types'

export const getStandings = () =>
  client.get<StandingGroup[]>('/tournament/standings').then(r => r.data)

export const getTopScorers = () =>
  client.get<TopScorer[]>('/tournament/topscorers').then(r => r.data)

export const getTeamDetail = (teamId: number) =>
  client.get<TeamDetail>(`/tournament/teams/${teamId}`).then(r => r.data)
