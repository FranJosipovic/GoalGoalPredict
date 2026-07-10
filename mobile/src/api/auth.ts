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

// Exchange a Google ID token for our own JWT (sign-in / auto-provision).
export const googleSignIn = (credential: string) =>
  client.post<AuthResponse>('/auth/google', { credential }).then((r) => r.data)

// Link Google to an existing account identified by email+password (used when the
// user logged in with an unverified email and wants to confirm via Google instead).
export const linkGoogleWithCredentials = (email: string, password: string, credential: string) =>
  client
    .post<AuthResponse>('/auth/google/link-credentials', { email, password, credential })
    .then((r) => r.data)

export const resendVerification = (email: string) =>
  client.post('/auth/resend-verification', { email }).then((r) => r.data)

// Marks the current user onboarded and stores their chosen language. Returns the updated user.
export const completeOnboarding = (language: string) =>
  client.post<User>('/auth/onboarding', { language }).then((r) => r.data)

export const getMe = () => client.get<User>('/auth/me').then((r) => r.data)
