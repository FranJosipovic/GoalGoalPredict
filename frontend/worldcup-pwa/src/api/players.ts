import client from './client'
import type { PlayerStats } from '../types'

export const getPlayerStats = (playerId: number) =>
  client.get<PlayerStats>(`/players/${playerId}/stats`).then(r => r.data)
