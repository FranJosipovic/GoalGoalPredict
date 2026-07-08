import * as SecureStore from 'expo-secure-store'
import i18n, { isSupported, type LanguageCode } from './config'

const KEY = 'preferred_language'

// Applies a language app-wide and remembers it on the device. Server persistence
// (per account) happens separately when onboarding completes.
export async function setLanguage(code: LanguageCode) {
  await i18n.changeLanguage(code)
  try {
    await SecureStore.setItemAsync(KEY, code)
  } catch {
    // Non-fatal — falls back to device language next launch.
  }
}

// Resolution order: saved device choice → the account's stored preference → device locale.
export async function applyStoredLanguage(accountLanguage?: string | null) {
  let saved: string | null = null
  try {
    saved = await SecureStore.getItemAsync(KEY)
  } catch {
    // ignore
  }
  const chosen = [saved, accountLanguage].find(isSupported)
  if (chosen) await i18n.changeLanguage(chosen)
}
