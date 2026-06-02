import client from './client'
import type { MatchListItem, MatchDetail, GroupPredictions, LeaderboardEntry, MyPredictionItem } from '../types'

export const getMatches = (groupId: string) =>
  client.get<MatchListItem[]>('/matches', { params: { groupId } }).then(r => r.data)

export const getMatchDetail = (id: number) =>
  client.get<MatchDetail>(`/matches/${id}`).then(r => r.data)

export const getMatchPredictions = (id: number, groupId: string) =>
  client.get<GroupPredictions>(`/matches/${id}/predictions`, { params: { groupId } }).then(r => r.data)

export const getLeaderboard = (groupId: string) =>
  client.get<LeaderboardEntry[]>('/predictions/leaderboard', { params: { groupId } }).then(r => r.data)

export const getMyPredictions = (groupId: string) =>
  client.get<MyPredictionItem[]>('/predictions/mine', { params: { groupId } }).then(r => r.data)

export const getUserPredictions = (userId: string, groupId: string) =>
  client.get<MyPredictionItem[]>(`/predictions/user/${userId}`, { params: { groupId } }).then(r => r.data)

export const getMyPrediction = (matchId: number, groupId: string) =>
  client.get(`/predictions/my`, { params: { matchId, groupId } })
    .then(r => r.status === 204 ? null : r.data)
    .catch(() => null)

export const upsertPrediction = (data: {
  matchId: number
  groupId: string
  homeGoals: number
  awayGoals: number
  goalscorerPlayerIds: number[]
}) => client.post('/predictions', data).then(r => r.data)
