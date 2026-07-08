import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuthStore } from '../store/authStore'
import { colors, fonts } from '../theme'
import Icon, { type IconName } from './Icon'
import type { RootStackParamList } from '../navigation'

type Nav = NativeStackNavigationProp<RootStackParamList>
type TabKey = 'groups' | 'tournament' | 'admin'

// Bottom tab bar, mirrors the PWA's Layout nav. Tournament/Admin are placeholders
// until those pages are ported.
export default function BottomNav({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<Nav>()
  const user = useAuthStore((s) => s.user)

  const items: { key: TabKey; label: string; icon: IconName; route: keyof RootStackParamList }[] = [
    { key: 'groups', label: 'Groups', icon: 'users', route: 'Groups' },
    { key: 'tournament', label: 'Tournament', icon: 'globe', route: 'Tournament' },
  ]
  if (user?.isAdmin) items.push({ key: 'admin', label: 'Admin', icon: 'star', route: 'Admin' })

  return (
    <View style={[styles.nav, { paddingBottom: insets.bottom, height: 60 + insets.bottom }]}>
      {items.map((it) => {
        const isActive = it.key === active
        const color = isActive ? colors.accent : colors.textMuted
        return (
          <TouchableOpacity
            key={it.key}
            style={styles.item}
            onPress={() => navigation.navigate(it.route as any)}
            activeOpacity={0.7}
          >
            <Icon name={it.icon} size={22} color={color} />
            <Text style={[styles.label, { color }]}>{it.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 8 },
  label: { fontFamily: fonts.body, fontSize: 11 },
})
