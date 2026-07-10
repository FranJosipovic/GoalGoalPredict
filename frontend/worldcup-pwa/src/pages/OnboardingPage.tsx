import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from '../i18n'
import { completeOnboarding } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { SUPPORTED_LEAGUES } from '../config/leagues'

// Content steps after the language picker. Keys map into the locale JSON.
const STEPS = [
  { key: 'welcome', emoji: '⚽' },
  { key: 'leagues', emoji: '🏆' },
  { key: 'groups', emoji: '👥' },
  { key: 'predict', emoji: '🎯' },
  { key: 'scoring', emoji: '📊' },
  { key: 'leaderboard', emoji: '🥇' },
] as const

const TOTAL = STEPS.length + 1 // + language picker

export default function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [index, setIndex] = useState(0)
  const [lang, setLang] = useState(i18n.language)
  const [finishing, setFinishing] = useState(false)

  const isLanguageStep = index === 0
  const isLast = index === TOTAL - 1
  const step = isLanguageStep ? null : STEPS[index - 1]

  const pickLanguage = (code: LanguageCode) => {
    setLang(code)
    setLanguage(code)
  }

  const finish = async () => {
    setFinishing(true)
    try {
      const updated = await completeOnboarding(lang)
      setUser(updated)
    } catch {
      // Don't trap the user if the call fails — flip locally; the server flag
      // reconciles on next load.
      if (user) setUser({ ...user, hasOnboarded: true, preferredLanguage: lang })
    } finally {
      setFinishing(false)
      navigate('/groups', { replace: true })
    }
  }

  const next = () => (isLast ? finish() : setIndex((i) => i + 1))

  return (
    <div className="auth-page">
      <div className="auth-bg-decoration">
        <div className="deco-circle deco-1" />
        <div className="deco-circle deco-2" />
        <div className="pitch-lines" />
      </div>

      <div className="auth-card onb-card">
        <div className="onb-top">
          <div className="onb-dots">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span key={i} className={`onb-dot ${i === index ? 'active' : ''}`} />
            ))}
          </div>
          {!isLast && (
            <button type="button" className="onb-skip" onClick={finish} disabled={finishing}>
              {t('common.skip')}
            </button>
          )}
        </div>

        <div className="onb-body">
          {isLanguageStep ? (
            <>
              <div className="onb-emoji">🌐</div>
              <h2 className="onb-title">{t('language.title')}</h2>
              <p className="onb-sub">{t('language.subtitle')}</p>
              <div className="onb-lang-list">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`onb-lang ${l.code === lang ? 'active' : ''}`}
                    onClick={() => pickLanguage(l.code)}
                  >
                    <span>{l.label}</span>
                    {l.code === lang && <span className="onb-lang-check">✓</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="onb-emoji">{step!.emoji}</div>
              <h2 className="onb-title">{t(`onboarding.${step!.key}.title`)}</h2>
              <p className="onb-sub">{t(`onboarding.${step!.key}.body`)}</p>

              {step!.key === 'leagues' && (
                <div className="onb-leagues">
                  {SUPPORTED_LEAGUES.map((lg) => (
                    <span key={lg.key} className="onb-league">
                      <span className="onb-league-emoji">{lg.emoji}</span>
                      {lg.name}
                      {!lg.live && <span className="onb-league-soon">{t('onboarding.leagues.soon')}</span>}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="onb-nav">
          {index > 0 ? (
            <button type="button" className="btn-ghost" onClick={() => setIndex((i) => i - 1)} disabled={finishing}>
              {t('common.back')}
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn-primary onb-next" onClick={next} disabled={finishing}>
            {finishing ? <span className="spinner" /> : isLast ? t('common.getStarted') : t('common.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
