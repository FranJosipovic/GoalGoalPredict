import client from './client'
import type { AuthResponse, User } from '../types'

export const login = (data: { email: string; password: string }) =>
  client.post<AuthResponse>('/auth/login', data).then((r) => r.data)

// Exchange a Google ID token for our own JWT (sign-in / auto-provision).
export const googleSignIn = (credential: string) =>
  client.post<AuthResponse>('/auth/google', { credential }).then((r) => r.data)

export const getMe = () => client.get<User>('/auth/me').then((r) => r.data)
