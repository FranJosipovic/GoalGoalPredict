import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts } from '../theme'
import AccountMenu from './AccountMenu'

// App header: GG PREDICT wordmark + account menu. Mirrors the PWA's Layout header.
export default function Header() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
      <View style={styles.left}>
        <Text style={styles.logo}>
          GG<Text style={styles.accent}>PREDICT</Text>
        </Text>
      </View>
      <View style={styles.right}>
        <AccountMenu />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { fontFamily: fonts.headingBold, fontSize: 20, letterSpacing: 1, color: colors.text },
  accent: { color: colors.accent },
})
