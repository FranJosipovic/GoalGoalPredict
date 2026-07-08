import client from './client'
import type { StandingGroup } from '../types'

export const getStandings = () =>
  client.get<StandingGroup[]>('/tournament/standings').then((r) => r.data)
