import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import en from './locales/en.json'
import hr from './locales/hr.json'
import de from './locales/de.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import it from './locales/it.json'

// Languages we ship translations for. `label` is shown natively in the picker.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hr', label: 'Hrvatski' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

const resources = {
  en: { translation: en },
  hr: { translation: hr },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
}

export function isSupported(code?: string | null): code is LanguageCode {
  return !!code && SUPPORTED_LANGUAGES.some((l) => l.code === code)
}

// Best-effort match of the device's preferred languages to one we support.
export function detectDeviceLanguage(): LanguageCode {
  for (const loc of Localization.getLocales()) {
    if (isSupported(loc.languageCode)) return loc.languageCode
  }
  return 'en'
}

// Initialised synchronously with the device language; a saved/user preference is
// applied later via setLanguage() once storage / the auth session has loaded.
i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
