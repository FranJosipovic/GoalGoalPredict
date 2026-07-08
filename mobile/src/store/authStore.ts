import { create } from 'zustand'
import type { User } from '../types'
import { hydrateToken, setToken, clearToken } from '../api/token'
import { setUnauthorizedHandler } from '../api/client'
import { getMe } from '../api/auth'

// Ported from the PWA's zustand store, adapted for async SecureStore.
// `hydrating` is true until we've restored any saved session at startup so the
// UI can show a splash instead of flashing the login screen.

interface AuthState {
  token: string | null
  user: User | null
  hydrating: boolean
  signIn: (token: string, user: User) => Promise<void>
  signOut: () => Promise<void>
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrating: true,

  signIn: async (token, user) => {
    await setToken(token)
    set({ token, user })
  },

  signOut: async () => {
    await clearToken()
    set({ token: null, user: null })
  },

  hydrate: async () => {
    // A 401 anywhere drops us back to signed-out state.
    setUnauthorizedHandler(() => set({ token: null, user: null }))

    const token = await hydrateToken()
    if (!token) {
      set({ hydrating: false })
      return
    }
    // We have a token — verify it's still valid and refresh the user.
    try {
      const user = await getMe()
      set({ token, user, hydrating: false })
    } catch {
      await clearToken()
      set({ token: null, user: null, hydrating: false })
    }
  },
}))
