import client from './client'
import type { AuthResponse, User } from '../types'

export interface RegisterResponse {
  requiresVerification: boolean
  email: string
}

export const register = (data: {
  email: string
  firstName: string
  lastName: string
  password: string
}) => client.post<RegisterResponse>('/auth/register', data).then((r) => r.data)

export const login = (data: { email: string; password: string }) =>
  client.post<AuthResponse>('/auth/login', data).then((r) => r.data)

export const googleSignIn = (credential: string) =>
  client.post<AuthResponse>('/auth/google', { credential }).then((r) => r.data)

// Link Google to the currently signed-in account (proven by JWT); updates the
// account's email to the Google address and verifies it. Preserves Id/points.
export const linkGoogleAuthed = (credential: string) =>
  client.post<AuthResponse>('/auth/google/link', { credential }).then((r) => r.data)

// Link Google to an existing account identified by email+password (used when the
// user logged in with an unverified/typo email and wants to switch to Google).
export const linkGoogleWithCredentials = (email: string, password: string, credential: string) =>
  client.post<AuthResponse>('/auth/google/link-credentials', { email, password, credential }).then((r) => r.data)

export const verifyEmail = (token: string) =>
  client.post<AuthResponse>('/auth/verify-email', { token }).then((r) => r.data)

export const resendVerification = (email: string) =>
  client.post('/auth/resend-verification', { email }).then((r) => r.data)

export const getMe = () => client.get<User>('/auth/me').then((r) => r.data)

export const updateProfile = (data: { firstName: string; lastName: string }) =>
  client.put<User>('/auth/me', data).then((r) => r.data)
