import client from './client'
import type { Group, GroupDetail } from '../types'

export const createGroup = (name: string) =>
  client.post<Group>('/groups', { name }).then((r) => r.data)

export const joinGroup = (inviteCode: string) =>
  client.post<Group>('/groups/join', { inviteCode }).then((r) => r.data)

export const getGroups = () =>
  client.get<Group[]>('/groups').then((r) => r.data)

export const getGroupDetail = (id: string) =>
  client.get<GroupDetail>(`/groups/${id}`).then((r) => r.data)
