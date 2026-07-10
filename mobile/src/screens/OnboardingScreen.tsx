import { useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { completeOnboarding } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { SUPPORTED_LANGUAGES } from '../i18n/config'
import { setLanguage } from '../i18n/language'
import i18n from '../i18n/config'
import { SUPPORTED_LEAGUES } from '../config/leagues'
import { colors, fonts, radius } from '../theme'

// Content steps (after the language picker). Each maps to keys in the locale JSON.
const STEPS = [
  { key: 'welcome', emoji: '⚽' },
  { key: 'leagues', emoji: '🏆' },
  { key: 'groups', emoji: '👥' },
  { key: 'predict', emoji: '🎯' },
  { key: 'scoring', emoji: '📊' },
  { key: 'leaderboard', emoji: '🥇' },
] as const

// index 0 = language picker, then one per STEP.
const TOTAL = STEPS.length + 1

export function OnboardingScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [index, setIndex] = useState(0)
  const [lang, setLang] = useState(i18n.language)
  const [finishing, setFinishing] = useState(false)

  const isLanguageStep = index === 0
  const isLast = index === TOTAL - 1
  const step = isLanguageStep ? null : STEPS[index - 1]

  async function pickLanguage(code: string) {
    setLang(code)
    await setLanguage(code as any)
  }

  async function finish() {
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
    }
  }

  function next() {
    if (isLast) finish()
    else setIndex((i) => i + 1)
  }

  return (
    <View style={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      {/* Top row: progress dots + skip */}
      <View style={styles.topRow}>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        {!isLast && (
          <TouchableOpacity onPress={finish} disabled={finishing}>
            <Text style={styles.skip}>{t('common.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {isLanguageStep ? (
          <>
            <Text style={styles.emoji}>🌐</Text>
            <Text style={styles.title}>{t('language.title')}</Text>
            <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
            <View style={styles.langList}>
              {SUPPORTED_LANGUAGES.map((l) => {
                const active = l.code === lang
                return (
                  <TouchableOpacity
                    key={l.code}
                    style={[styles.langRow, active && styles.langRowActive]}
                    onPress={() => pickLanguage(l.code)}
                  >
                    <Text style={[styles.langLabel, active && styles.langLabelActive]}>{l.label}</Text>
                    {active && <Text style={styles.langCheck}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.emoji}>{step!.emoji}</Text>
            <Text style={styles.title}>{t(`onboarding.${step!.key}.title`)}</Text>
            <Text style={styles.subtitle}>{t(`onboarding.${step!.key}.body`)}</Text>

            {step!.key === 'leagues' && (
              <View style={styles.leagueList}>
                {SUPPORTED_LEAGUES.map((lg) => (
                  <View key={lg.key} style={styles.leagueChip}>
                    <Text style={styles.leagueEmoji}>{lg.emoji}</Text>
                    <Text style={styles.leagueName}>{lg.name}</Text>
                    {!lg.live && <Text style={styles.leagueSoon}>{t('onboarding.leagues.soon')}</Text>}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.nav}>
        {index > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setIndex((i) => i - 1)} disabled={finishing}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <TouchableOpacity style={[styles.nextBtn, finishing && styles.disabled]} onPress={next} disabled={finishing}>
          {finishing ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.nextText}>{isLast ? t('common.getStarted') : t('common.next')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 32 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surface3 },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  skip: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 14 },

  body: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.text, textAlign: 'center', marginBottom: 12 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 340,
  },

  langList: { width: '100%', marginTop: 24, gap: 10 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  langRowActive: { borderColor: colors.accent, backgroundColor: colors.surface3 },
  langLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  langLabelActive: { color: colors.accent },
  langCheck: { color: colors.accent, fontFamily: fonts.heading, fontSize: 16 },

  leagueList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 },
  leagueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leagueEmoji: { fontSize: 14 },
  leagueName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  leagueSoon: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginLeft: 2,
    textTransform: 'uppercase',
  },

  nav: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { minWidth: 72, paddingVertical: 14, alignItems: 'flex-start', justifyContent: 'center' },
  backText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  nextBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: colors.onAccent, fontFamily: fonts.heading, fontSize: 15, letterSpacing: 1 },
  disabled: { opacity: 0.6 },
})
