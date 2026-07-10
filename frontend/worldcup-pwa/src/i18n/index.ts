import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
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

const SUPPORTED = SUPPORTED_LANGUAGES.map((l) => l.code)

export function isSupported(code?: string | null): code is LanguageCode {
  return !!code && (SUPPORTED as string[]).includes(code)
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hr: { translation: hr },
      de: { translation: de },
      es: { translation: es },
      fr: { translation: fr },
      it: { translation: it },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED,
    // Match "en-US" → "en" etc. so browser regional locales still resolve.
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      // Explicit choice (localStorage) wins over the browser language.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  })

// Change language app-wide + remember it (LanguageDetector caches to localStorage).
export function setLanguage(code: LanguageCode) {
  return i18n.changeLanguage(code)
}

// Apply the account's saved language only if the user hasn't made an explicit
// choice on this device (localStorage). Device/browser choice always wins.
export function applyAccountLanguage(accountLanguage?: string | null) {
  const explicit = localStorage.getItem('i18nextLng')
  if (!explicit && isSupported(accountLanguage)) i18n.changeLanguage(accountLanguage)
}

export default i18n
