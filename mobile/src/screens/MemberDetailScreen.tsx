import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getUserPredictions } from '../api/matches'
import { colors, fonts, radius } from '../theme'
import Icon from '../components/Icon'
import PicksByTeam from '../components/PicksByTeam'
import type { MyPredictionItem } from '../types'
import type { ScreenProps } from '../navigation'

const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P']
const FINISHED = ['FT', 'AET', 'PEN']
const formatKickoff = (utc: string) =>
  new Date(utc).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Points breakdown from backend-awarded pointsAwarded (rules-agnostic).
function breakdown(p: MyPredictionItem) {
  const hasResult = p.actualHome !== null && p.actualAway !== null
  if (!hasResult) return null
  const exact = p.predHome === p.actualHome && p.predAway === p.actualAway
  const outcome = !exact && Math.sign(p.predHome - p.predAway) === Math.sign((p.actualHome ?? 0) - (p.actualAway ?? 0))
  const total = p.isScored ? p.points ?? 0 : p.projectedPoints
  const scorer = p.scorers.reduce((s, x) => s + x.pointsAwarded, 0)
  const card = p.cards.reduce((s, x) => s + x.pointsAwarded, 0)
  const result = total - scorer - card
  return { exact, outcome, scorer, card, result, total }
}

export function MemberDetailScreen({ route, navigation }: ScreenProps<'MemberDetail'>) {
  const { groupId, userId, name, isMe } = route.params
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<MyPredictionItem[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ totalPoints: 0, exactCount: 0, scorerPoints: 0 })
  const [loading, setLoading] = useState(true)
  const [take, setTake] = useState(3)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    getUserPredictions(userId, groupId, take)
      .then((data) => {
        setItems(data.items)
        setTotal(data.total)
        setStats({ totalPoints: data.totalPoints, exactCount: data.exactCount, scorerPoints: data.scorerPoints })
      })
      .finally(() => {
        setLoading(false)
        setLoadingMore(false)
      })
  }, [groupId, userId, take])

  const initials = name.split(' ').map((s) => s[0]).slice(0, 2).join('')
  const shown = [...items].sort((a, b) => new Date(b.kickoffUtc).getTime() - new Date(a.kickoffUtc).getTime())
  const hasMore = total > items.length

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isMe ? 'My history' : name}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{name}</Text>
              {isMe && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>you</Text>
                </View>
              )}
            </View>
            <View style={styles.heroStats}>
              <Text style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{stats.totalPoints}</Text> pts
              </Text>
              <Text style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{stats.exactCount}</Text> exact
              </Text>
              <Text style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{stats.scorerPoints}</Text> scorer
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="target" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No visible picks</Text>
            <Text style={styles.emptySub}>Their picks appear once matches kick off</Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {shown.map((p) => {
              const b = breakdown(p)
              const hasResult = p.actualHome !== null && p.actualAway !== null
              const isLive = LIVE.includes(p.status)
              const isFinished = FINISHED.includes(p.status)
              return (
                <View key={p.matchId} style={[styles.card, b?.exact && styles.cardExact]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.round}>{p.round}</Text>
                    <Text style={styles.when}>{formatKickoff(p.kickoffUtc)}</Text>
                    {isLive && (
                      <View style={styles.flagLive}>
                        <View style={styles.liveDot} />
                        <Text style={styles.flagLiveText}>LIVE</Text>
                      </View>
                    )}
                    {isFinished && (
                      <View style={styles.flagFt}>
                        <Text style={styles.flagFtText}>FT</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.fixture}>
                    <View style={styles.team}>
                      <Image source={{ uri: p.homeTeam.logoUrl }} style={styles.logo} resizeMode="contain" />
                      <Text style={styles.code}>{p.homeTeam.code}</Text>
                    </View>
                    <View style={styles.scores}>
                      <Text style={styles.pick}>
                        {p.predHome}–{p.predAway}
                      </Text>
                      {hasResult && (
                        <Text style={styles.real}>
                          ({p.actualHome}–{p.actualAway})
                        </Text>
                      )}
                    </View>
                    <View style={[styles.team, styles.teamRight]}>
                      <Text style={styles.code}>{p.awayTeam.code}</Text>
                      <Image source={{ uri: p.awayTeam.logoUrl }} style={styles.logo} resizeMode="contain" />
                    </View>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <PicksByTeam scorers={p.scorers} cards={p.cards} home={p.homeTeam} away={p.awayTeam} />
                  </View>

                  <View style={styles.bd}>
                    {b ? (
                      <>
                        {b.exact && <Chip label={`Exact +${b.result}`} tone="exact" />}
                        {b.outcome && <Chip label={`Outcome +${b.result}`} />}
                        {!b.exact && !b.outcome && <Chip label="Score missed" tone="miss" />}
                        {b.scorer !== 0 && <Chip label={`Scorers +${b.scorer}`} tone="scorer" />}
                        {b.card !== 0 && <Chip label={`Cards ${b.card > 0 ? `+${b.card}` : b.card}`} tone="scorer" />}
                        <Text style={styles.total}>
                          {b.total} pts {!p.isScored && <Text style={styles.totalLive}>live</Text>}
                        </Text>
                      </>
                    ) : (
                      <Chip label="Not started" />
                    )}
                  </View>
                </View>
              )
            })}
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMore}
                disabled={loadingMore}
                onPress={() => {
                  setLoadingMore(true)
                  setTake((t) => t + 3)
                }}
              >
                {loadingMore ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={styles.loadMoreText}>Load more</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function Chip({ label, tone }: { label: string; tone?: 'exact' | 'miss' | 'scorer' }) {
  return (
    <View style={[styles.chip, tone === 'exact' && styles.chipExact]}>
      <Text style={[styles.chipText, tone === 'miss' && styles.chipMiss, tone === 'scorer' && styles.chipScorer, tone === 'exact' && styles.chipTextExact]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: 18, letterSpacing: 0.5, color: colors.text, marginHorizontal: 8 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface2 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.bg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  name: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  youBadge: { backgroundColor: colors.accent, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  youBadgeText: { fontFamily: fonts.heading, fontSize: 10, color: colors.onAccent },
  heroStats: { flexDirection: 'row', gap: 16 },
  heroStat: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  heroStatNum: { fontFamily: fonts.heading, fontSize: 16, color: colors.accent },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 10 },
  cardExact: { borderColor: colors.borderSolid },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  round: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  when: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginLeft: 'auto' },
  flagLive: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef5350' },
  flagLiveText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: '#ef5350' },
  flagFt: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  flagFtText: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },

  fixture: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  team: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  teamRight: { justifyContent: 'flex-end' },
  logo: { width: 24, height: 24 },
  code: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  scores: { alignItems: 'center' },
  pick: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  real: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },

  bd: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.surface2 },
  chipExact: { backgroundColor: colors.accentGlow },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.textMuted },
  chipTextExact: { color: colors.accent },
  chipMiss: { color: '#ef5350' },
  chipScorer: { color: '#ffd54f' },
  total: { marginLeft: 'auto', fontFamily: fonts.headingBold, fontSize: 16, color: colors.accent },
  totalLive: { fontFamily: fonts.body, fontSize: 9, color: '#ef5350' },

  loadMore: { marginTop: 2, paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSolid, alignItems: 'center' },
  loadMoreText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accent },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginTop: 16, marginBottom: 8 },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
})
