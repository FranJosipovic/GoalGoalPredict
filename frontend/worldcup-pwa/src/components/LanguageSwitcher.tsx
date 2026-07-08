import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from '../i18n'
import { completeOnboarding } from '../api/auth'
import { useAuthStore } from '../store/authStore'

// Post-onboarding language picker. Changes the UI language immediately (cached to
// localStorage) and best-effort persists it to the account so it follows the user
// to other devices. Reuses the onboarding endpoint (the user is already onboarded).
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const setUser = useAuthStore((s) => s.setUser)
  const current = i18n.resolvedLanguage ?? i18n.language

  const onChange = async (code: LanguageCode) => {
    await setLanguage(code)
    try {
      const updated = await completeOnboarding(code)
      setUser(updated)
    } catch {
      // Non-fatal — the device already switched; account sync retries next change.
    }
  }

  return (
    <div className="field">
      <label className="field-label">{t('common.language')}</label>
      <select
        className="field-input"
        value={current}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
