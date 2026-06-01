import client from './client'
import type { TeamInfo, TeamSquad } from '../types'

export const getTeams = () =>
  client.get<TeamInfo[]>('/teams').then(r => r.data)

export const getTeamSquad = (teamId: number) =>
  client.get<TeamSquad>(`/teams/${teamId}/players`).then(r => r.data)
