import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../store/authStore'
import { colors, fonts, radius } from '../theme'
import Icon from './Icon'

// Top-right account menu, ported from the PWA's TopBarMenu. Profile + logout for
// now; theme toggle and notifications land with their own features later.
export default function AccountMenu() {
  const { user, signOut } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)

  if (!user) return null
  const initial = (user.firstName?.[0] ?? '?').toUpperCase()

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
})
