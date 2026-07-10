import * as SecureStore from 'expo-secure-store'

// SecureStore is async, but the axios interceptor needs the token synchronously.
// So we keep an in-memory copy that mirrors secure storage. Hydrate once at
// startup, then reads are instant and writes fan out to the secure store.

const TOKEN_KEY = 'token'

let memoryToken: string | null = null

export const getToken = () => memoryToken

export async function hydrateToken(): Promise<string | null> {
  memoryToken = await SecureStore.getItemAsync(TOKEN_KEY)
  return memoryToken
}

export async function setToken(token: string) {
  memoryToken = token
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearToken() {
  memoryToken = null
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}
