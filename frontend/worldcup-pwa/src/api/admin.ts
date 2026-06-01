import client from './client'

export const getSimGroups = () =>
  client.get('/sim/groups').then(r => r.data)

export const createSimGroup = (name: string) =>
  client.post('/sim/groups', { name }).then(r => r.data)

export const getSimMatches = (groupId?: string) =>
  client.get('/sim/matches', { params: groupId ? { groupId } : {} }).then(r => r.data)

export const getSimMatch = (id: number) =>
  client.get(`/sim/matches/${id}`).then(r => r.data)

export const createSimMatch = (data: CreateSimMatchPayload) =>
  client.post('/sim/matches', data).then(r => r.data)

export const forceMatchStatus = (id: number, status: string, elapsedMinutes?: number) =>
  client.put(`/sim/matches/${id}/status`, { status, elapsedMinutes }).then(r => r.data)

export const makeAdmin = (email: string) =>
  client.post('/sim/make-admin', { email }).then(r => r.data)

export const getTeamsForAdmin = () =>
  client.get('/teams').then(r => r.data)

export const getTeamPlayersForAdmin = (teamId: number) =>
  client.get(`/teams/${teamId}/players`).then(r => r.data)

export interface LineupPlayerInput {
  playerId: number
  position: string
  shirtNumber: number
}

export interface EventInput {
  playerId: number
  teamId: number
  minute: number
  goalType: string
}

export interface CreateSimMatchPayload {
  groupId: string
  homeTeamId: number
  awayTeamId: number
  kickoffUtc: string
  homeFormation: string
  awayFormation: string
  homeLineup: LineupPlayerInput[]
  awayLineup: LineupPlayerInput[]
  events: EventInput[]
}
