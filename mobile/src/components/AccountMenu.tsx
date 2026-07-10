import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { completeOnboarding } from '../api/auth'
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../i18n/config'
import { setLanguage } from '../i18n/language'
import { colors, fonts, radius } from '../theme'
import Icon from './Icon'

// Top-right account menu, ported from the PWA's TopBarMenu. Profile + logout for
// now; theme toggle and notifications land with their own features later.
export default function AccountMenu() {
  const { t, i18n } = useTranslation()
  const { user, signOut, setUser } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  if (!user) return null
  const initial = (user.firstName?.[0] ?? '?').toUpperCase()
  const currentLang = i18n.resolvedLanguage ?? i18n.language

  const changeLang = async (code: LanguageCode) => {
    await setLanguage(code)
    try {
      const updated = await completeOnboarding(code)
      setUser(updated)
    } catch {
      // Non-fatal — UI already switched; account sync retries next change.
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.triggerText}>{initial}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.panel, { top: insets.top + 52 }]} onPress={() => {}}>
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.name} numberOfLines={1}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={styles.sub}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>{t('common.language')}</Text>
            <View style={styles.langWrap}>
              {SUPPORTED_LANGUAGES.map((l) => {
                const active = l.code === currentLang
                return (
                  <TouchableOpacity
                    key={l.code}
                    style={[styles.langPill, active && styles.langPillActive]}
                    onPress={() => changeLang(l.code)}
                  >
                    <Text style={[styles.langPillText, active && styles.langPillTextActive]}>{l.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                setOpen(false)
                signOut()
              }}
            >
              <View style={styles.rowIcon}>
                <Icon name="logout" size={18} color={colors.danger} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.danger }]}>Logout</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: { fontFamily: fonts.heading, fontSize: 15, color: colors.accent },
  backdrop: { flex: 1 },
  panel: {
    position: 'absolute',
    right: 12,
    width: 252,
    padding: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.heading, fontSize: 16, color: colors.accent },
  profileText: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6, marginHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, borderRadius: radius.sm },
  rowIcon: {},
  rowLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13 },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    paddingHorizontal: 11,
    paddingTop: 4,
    paddingBottom: 8,
  },
  langWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 8, paddingBottom: 4 },
  langPill: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langPillActive: { borderColor: colors.accent, backgroundColor: colors.surface3 },
  langPillText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.text },
  langPillTextActive: { color: colors.accent },
})
