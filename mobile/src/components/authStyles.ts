import { StyleSheet } from 'react-native'
import { colors, fonts, radius } from '../theme'

// Ported from the PWA auth CSS (.auth-heading, .field, .btn-primary, .auth-divider ...).
export const auth = StyleSheet.create({
  heading: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, marginBottom: 4 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginBottom: 22 },

  form: { gap: 16 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 6 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.7,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.body,
  },
  inputFocused: { borderColor: colors.accentDim },

  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontFamily: fonts.heading,
    fontSize: 15,
    letterSpacing: 1.2,
  },
  secondaryBtn: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryBtnText: { color: colors.text, fontFamily: fonts.heading, fontSize: 14, letterSpacing: 0.7 },
  disabled: { opacity: 0.5 },

  errorMsg: {
    backgroundColor: colors.errorBg,
    borderColor: 'rgba(255, 95, 87, 0.3)',
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    lineHeight: 18,
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 1,
    marginHorizontal: 12,
    textTransform: 'uppercase',
  },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  link: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },

  // Verify-email panel
  verifyWrap: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  verifyIcon: { fontSize: 40 },
  verifyTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, textAlign: 'center' },
  verifyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  verifyStrong: { color: colors.text, fontFamily: fonts.bodySemiBold },
  verifySent: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accent, textAlign: 'center' },
})
