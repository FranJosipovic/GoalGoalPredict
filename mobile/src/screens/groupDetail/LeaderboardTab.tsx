import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { getLeaderboard } from '../../api/matches'
import { useAuthStore } from '../../store/authStore'
import { colors, fonts, radius } from '../../theme'
import Icon from '../../components/Icon'
import type { LeaderboardEntry } from '../../types'
import type { RootStackParamList } from '../../navigation'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardTab({ groupId }: { groupId: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const user = useAuthStore((s) => s.user)
  const { t } = useTranslation()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard(groupId)
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [groupId])

  if (loading) return <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text style={styles.emptyTitle}>{t('groupDetail.boardEmptyTitle')}</Text>
        <Text style={styles.emptySub}>{t('groupDetail.boardEmptySub')}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
      {entries.map((e, i) => {
        const isMe = e.userId === user?.id
        return (
          <TouchableOpacity
            key={e.userId}
            style={[styles.row, isMe && styles.rowMe]}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('MemberDetail', {
                groupId,
                userId: e.userId,
                name: `${e.firstName} ${e.lastName}`,
                isMe,
              })
            }
          >
            <View style={styles.pos}>
              {i < 3 ? (
                <Text style={styles.medal}>{MEDALS[i]}</Text>
              ) : (
                <Text style={styles.posNum}>{e.position}</Text>
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {e.firstName} {e.lastName}
                {isMe && <Text style={styles.youBadge}>  {t('groupDetail.you')}</Text>}
              </Text>
            </View>
            <Text style={styles.pts}>
              {e.totalPoints}
              <Text style={styles.ptsLabel}> {t('groupDetail.pts')}</Text>
            </Text>
            <Icon name="chevronRight" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  list: { padding: 16, gap: 8, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
  },
  rowMe: { borderColor: colors.accentDim, backgroundColor: colors.accentGlow },
  pos: { width: 30, alignItems: 'center', justifyContent: 'center' },
  medal: { fontSize: 22 },
  posNum: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.textMuted },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  youBadge: { fontFamily: fonts.heading, fontSize: 11, color: colors.accent },
  pts: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.accent },
  ptsLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 44, marginBottom: 16 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 8 },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
})
