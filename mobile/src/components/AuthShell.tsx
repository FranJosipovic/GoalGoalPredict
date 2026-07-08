import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { colors, fonts } from '../theme'

/**
 * Branded auth scaffold ported from the PWA's `.auth-page` / `.auth-card`.
 * Renders the dark glow background, the centred card, and the GOALGOAL PREDICT
 * brand block. Screens pass their form/heading as children.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.page}>
      {/* Decorative accent glows (approximates the PWA's blurred deco circles). */}
      <View pointerEvents="none" style={[styles.glow, styles.glow1]} />
      <View pointerEvents="none" style={[styles.glow, styles.glow2]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.brand}>
              <Text style={styles.ball}>⚽</Text>
              <Text style={styles.brandName}>
                GOAL<Text style={styles.brandAccent}>GOAL</Text>
              </Text>
              <Text style={styles.brandSub}>PREDICT</Text>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', borderRadius: 9999, backgroundColor: colors.accentGlow },
  glow1: { width: 360, height: 360, top: -120, right: -100, opacity: 0.5 },
  glow2: { width: 280, height: 280, bottom: -80, left: -100, opacity: 0.35 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
  },
  brand: { alignItems: 'center', marginBottom: 24 },
  ball: { fontSize: 34, marginBottom: 6 },
  brandName: { fontFamily: fonts.headingBold, fontSize: 28, letterSpacing: 2, color: colors.text },
  brandAccent: { color: colors.accent },
  brandSub: {
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 4,
    color: colors.textMuted,
    marginTop: 2,
  },
})
