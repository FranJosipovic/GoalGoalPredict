import client from './client'
import type {
  MatchListItem,
  MatchDetail,
  LeaderboardEntry,
  MyPredictionItem,
  GroupPredictions,
  PredictionResult,
  ScorerPickInput,
  CardPickInput,
} from '../types'

export const getMatchDetail = (id: number) =>
  client.get<MatchDetail>(`/matches/${id}`).then((r) => r.data)

export const getLeaderboard = (groupId: string) =>
  client
    .get<LeaderboardEntry[]>('/predictions/leaderboard', { params: { groupId } })
    .then((r) => r.data)

export interface PagedMyPredictions {
  items: MyPredictionItem[]
  finishedTotal: number
  totalPicks: number
  totalPoints: number
  exactCount: number
}

// finishedTake pages finished picks; active picks always returned in full.
export const getMyPredictions = (groupId: string, finishedTake: number) =>
  client
    .get<PagedMyPredictions>('/predictions/mine', { params: { groupId, finishedTake } })
    .then((r) => r.data)

export const getMatchPredictions = (id: number, groupId: string) =>
  client
    .get<GroupPredictions>(`/matches/${id}/predictions`, { params: { groupId } })
    .then((r) => r.data)

export interface PagedUserPredictions {
  items: MyPredictionItem[]
  total: number
  totalPoints: number
  exactCount: number
  scorerPoints: number
}

// `take` pages a member's history latest-first; stats are aggregated server-side.
export const getUserPredictions = (userId: string, groupId: string, take: number) =>
  client
    .get<PagedUserPredictions>(`/predictions/user/${userId}`, { params: { groupId, take } })
    .then((r) => r.data)

// ── Placing / editing a prediction ───────────────────────
export const getMyPrediction = (matchId: number, groupId: string) =>
  client
    .get<PredictionResult>('/predictions/my', { params: { matchId, groupId } })
    .then((r) => (r.status === 204 ? null : r.data))
    .catch(() => null)

export const upsertPrediction = (data: {
  matchId: number
  groupId: string
  homeGoals: number
  awayGoals: number
  scorers: ScorerPickInput[]
  cards: CardPickInput[]
  finishType?: string | null
}) => client.post('/predictions', data).then((r) => r.data)

export interface CopyablePrediction {
  sourceGroupId: string
  sourceGroupName: string
  homeGoals: number
  awayGoals: number
  scorers: ScorerPickInput[]
  cards: CardPickInput[]
  finishType?: string | null
}

export const getCopyablePrediction = (matchId: number, groupId: string) =>
  client
    .get<CopyablePrediction>('/predictions/copyable', { params: { matchId, groupId } })
    .then((r) => (r.status === 204 ? null : r.data))
    .catch(() => null)

export interface CopyTarget {
  groupId: string
  groupName: string
  alreadyPredicted: boolean
}

export const getCopyTargets = (matchId: number, groupId: string) =>
  client
    .get<CopyTarget[]>('/predictions/copy-targets', { params: { matchId, groupId } })
    .then((r) => r.data)
    .catch(() => [] as CopyTarget[])

export const copyPredictionToGroups = (data: {
  matchId: number
  sourceGroupId: string
  targetGroupIds: string[]
}) => client.post<{ copied: number; failed: number }>('/predictions/copy-to-groups', data).then((r) => r.data)

export interface PagedMatches {
  matches: MatchListItem[]
  finishedTotal: number
}

// finishedTake pages the finished-match history; live + upcoming are always returned in full.
export const getMatches = (groupId: string, finishedTake?: number) =>
  client
    .get<PagedMatches>('/matches', { params: { groupId, finishedTake } })
    .then((r) => r.data)
