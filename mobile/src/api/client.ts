import axios from 'axios'
import { getToken, clearToken } from './token'

// Ported from the PWA's client.ts. Differences vs web:
//  - baseURL comes from EXPO_PUBLIC_API_URL (not import.meta.env)
//  - token is read from an in-memory mirror of SecureStore (not localStorage)
//  - a 401 clears the token; navigation-to-login is handled by the auth store,
//    since there's no window.location in React Native.

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    'bypass-tunnel-reminder': 'true',
  },
})

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await clearToken()
      // The auth store subscribes to this; see onUnauthorized below.
      onUnauthorized?.()
    }
    return Promise.reject(err)
  }
)

// Lightweight hook so the auth store can react to a 401 without a circular import.
let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

export default client
