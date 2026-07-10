import client from './client'
import type { Group, GroupDetail, GroupScoringRules } from '../types'

export const getGroups = () =>
  client.get<Group[]>('/groups').then((r) => r.data)

export const getGroupDetail = (id: string) =>
  client.get<GroupDetail>(`/groups/${id}`).then((r) => r.data)

export const resetInviteCode = (id: string) =>
  client.post<Group>(`/groups/${id}/invite/reset`).then((r) => r.data)

export const kickGroupMember = (groupId: string, userId: string) =>
  client.delete(`/groups/${groupId}/members/${userId}`).then((r) => r.data)

export const getGroupRules = (id: string) =>
  client.get<GroupScoringRules>(`/groups/${id}/rules`).then((r) => r.data)

// Server computes isLocked/canEdit, so they're omitted from the update payload.
export type GroupRulesUpdate = Omit<GroupScoringRules, 'isLocked' | 'canEdit'>

export const updateGroupRules = (id: string, rules: GroupRulesUpdate) =>
  client.put<GroupScoringRules>(`/groups/${id}/rules`, rules).then((r) => r.data)

export const createGroup = (name: string) =>
  client.post<Group>('/groups', { name }).then((r) => r.data)

export const joinGroup = (inviteCode: string) =>
  client.post<Group>('/groups/join', { inviteCode }).then((r) => r.data)
