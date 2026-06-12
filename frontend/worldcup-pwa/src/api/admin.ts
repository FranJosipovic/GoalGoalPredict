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

// ── System / sync status ──────────────────────────────────────
export const getSystemStatus = () =>
  client.get('/admin/system').then(r => r.data)

export const syncTeamsPlayers = () =>
  client.post('/admin/sync-teams-players').then(r => r.data)

export const syncMissingPlayers = () =>
  client.post('/admin/sync-missing-players').then(r => r.data)

export const syncFixtures = () =>
  client.post('/admin/sync-fixtures').then(r => r.data)

export const getAdminMatches = () =>
  client.get('/admin/matches').then(r => r.data)

export const syncMatchEvents = (id: number) =>
  client.post(`/admin/matches/${id}/sync-events`).then(r => r.data)

export const syncMatchLineups = (id: number) =>
  client.post(`/admin/matches/${id}/sync-lineups`).then(r => r.data)

export const compareMatchEvents = (id: number) =>
  client.get(`/admin/compare/matches/${id}/events`).then(r => r.data)

export const compareMatchScoring = (id: number) =>
  client.get(`/admin/matches/${id}/scoring-compare`).then(r => r.data)

export const syncMatchScoring = (id: number) =>
  client.post(`/admin/matches/${id}/sync-scoring`).then(r => r.data)

// ── Compare DB vs API ─────────────────────────────────────────
export const compareTeams = () =>
  client.get('/admin/compare/teams').then(r => r.data)

export const compareFixtures = () =>
  client.get('/admin/compare/fixtures').then(r => r.data)

export const comparePlayers = (teamId?: number) =>
  client.get('/admin/compare/players', { params: teamId ? { teamId } : {} }).then(r => r.data)

export const prunePlayers = (teamId?: number) =>
  client.post('/admin/prune-players', null, { params: teamId ? { teamId } : {} }).then(r => r.data)

export const setPlayerActive = (playerId: number, isActive: boolean) =>
  client.post(`/admin/players/${playerId}/active`, { isActive }).then(r => r.data)

export const deletePlayer = (playerId: number) =>
  client.delete(`/admin/players/${playerId}`).then(r => r.data)

// ── Users ─────────────────────────────────────────────────────
export const getAdminUsers = (q?: string) =>
  client.get('/admin/users', { params: q ? { q } : {} }).then(r => r.data)

export const getAdminUser = (id: string) =>
  client.get(`/admin/users/${id}`).then(r => r.data)

export const setUserAdmin = (id: string, isAdmin: boolean) =>
  client.post(`/admin/users/${id}/admin`, { isAdmin }).then(r => r.data)

export const deleteUser = (id: string) =>
  client.delete(`/admin/users/${id}`).then(r => r.data)

// ── All groups (real + sim) ───────────────────────────────────
export const getAllGroups = (q?: string, type?: 'sim' | 'real') =>
  client.get('/admin/all-groups', { params: { ...(q ? { q } : {}), ...(type ? { type } : {}) } }).then(r => r.data)

export const getAllGroupDetail = (id: string) =>
  client.get(`/admin/all-groups/${id}`).then(r => r.data)

export const deleteGroup = (id: string) =>
  client.delete(`/admin/all-groups/${id}`).then(r => r.data)

export const removeGroupMember = (groupId: string, userId: string) =>
  client.delete(`/admin/all-groups/${groupId}/members/${userId}`).then(r => r.data)

export const transferGroupOwner = (groupId: string, newOwnerUserId: string) =>
  client.post(`/admin/all-groups/${groupId}/transfer-owner`, { newOwnerUserId }).then(r => r.data)

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
