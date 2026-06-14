import client from './client'
import type { Group, GroupDetail, GroupPreview, GroupScoringRules } from '../types'

export const createGroup = (name: string) =>
  client.post<Group>('/groups', { name }).then((r) => r.data)

export const joinGroup = (inviteCode: string) =>
  client.post<Group>('/groups/join', { inviteCode }).then((r) => r.data)

export const getGroups = () =>
  client.get<Group[]>('/groups').then((r) => r.data)

export const getGroupDetail = (id: string) =>
  client.get<GroupDetail>(`/groups/${id}`).then((r) => r.data)

// Public — resolves an invite code to a group name without auth.
export const getGroupPreview = (code: string) =>
  client.get<GroupPreview>(`/groups/preview/${code}`).then((r) => r.data)

export const resetInviteCode = (id: string) =>
  client.post<Group>(`/groups/${id}/invite/reset`).then((r) => r.data)

// Group owner removes a member from their group.
export const kickGroupMember = (groupId: string, userId: string) =>
  client.delete(`/groups/${groupId}/members/${userId}`).then((r) => r.data)

export const getGroupRules = (id: string) =>
  client.get<GroupScoringRules>(`/groups/${id}/rules`).then((r) => r.data)

// Omits server-computed isLocked/canEdit from the payload.
export type GroupRulesUpdate = Omit<GroupScoringRules, 'isLocked' | 'canEdit'>

export const updateGroupRules = (id: string, rules: GroupRulesUpdate) =>
  client.put<GroupScoringRules>(`/groups/${id}/rules`, rules).then((r) => r.data)
