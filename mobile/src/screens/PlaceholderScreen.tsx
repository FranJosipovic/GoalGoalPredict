import { StyleSheet, Text, View } from 'react-native'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { colors, fonts } from '../theme'

// Temporary stand-in for tabs not yet ported (Tournament, Admin).
export function makePlaceholder(active: 'tournament' | 'admin', label: string) {
  return function PlaceholderScreen() {
    return (
      <View style={styles.root}>
        <Header />
        <View style={styles.center}>
          <Text style={styles.emoji}>🚧</Text>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.sub}>Coming soon to mobile</Text>
        </View>
        <BottomNav active={active} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, marginBottom: 8 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
})
