import client from './client'
import type { AuthResponse, User } from '../types'

export const register = (data: {
  email: string
  firstName: string
  lastName: string
  password: string
}) => client.post<AuthResponse>('/auth/register', data).then((r) => r.data)

export const login = (data: { email: string; password: string }) =>
  client.post<AuthResponse>('/auth/login', data).then((r) => r.data)

export const getMe = () => client.get<User>('/auth/me').then((r) => r.data)

export const updateProfile = (data: { firstName: string; lastName: string }) =>
  client.put<User>('/auth/me', data).then((r) => r.data)
