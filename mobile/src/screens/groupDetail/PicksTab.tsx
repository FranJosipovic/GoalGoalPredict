import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { getMyPredictions, getMatchPredictions } from '../../api/matches'
import { useAuthStore } from '../../store/authStore'
import { colors, fonts, radius } from '../../theme'
import Icon from '../../components/Icon'
import PicksByTeam from '../../components/PicksByTeam'
import type { MyPredictionItem, GroupPredictions, TeamSummary, FinishType } from '../../types'

const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']
const FINISH_LABEL: Record<FinishType, string> = {
  Regular: 'Regular time',
  ExtraTime: 'Extra time',
  Penalties: 'Penalties',
}

type Bucket = 'live' | 'upcoming' | 'finished'
const bucketOf = (status: string): Bucket =>
  LIVE_STATUSES.includes(status) ? 'live' : FINISHED_STATUSES.includes(status) ? 'finished' : 'upcoming'

const formatKickoff = (utc: string) =>
  new Date(utc).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function GroupPicksPanel({
  matchId,
  groupId,
  meId,
  home,
  away,
}: {
  matchId: number
  groupId: string
  meId?: string
  home: TeamSummary
  away: TeamSummary
}) {
  const [data, setData] = useState<GroupPredictions | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'hidden'>('loading')

  useEffect(() => {
    let alive = true
    getMatchPredictions(matchId, groupId)
      .then((d) => alive && (setData(d), setState('ready')))
      .catch(() => alive && setState('hidden'))
    return () => {
      alive = false
    }
  }, [matchId, groupId])

  if (state === 'loading') return <Text style={styles.panelHint}>Loading picks…</Text>
  if (state === 'hidden' || !data)
    return (
      <View style={styles.panelHiddenRow}>
        <Icon name="lock" size={14} color={colors.textMuted} />
        <Text style={styles.panelHint}>Other picks reveal at kickoff</Text>
      </View>
    )

  const others = data.predictions.filter((p) => p.userId !== meId)
  if (others.length === 0) return <Text style={styles.panelHint}>No other picks yet</Text>

  return (
    <View style={styles.panel}>
      {others.map((p) => (
        <View key={p.userId} style={styles.picksRow}>
          <View style={styles.picksRowMain}>
            <View style={styles.picksAvatar}>
              <Text style={styles.picksAvatarText}>
                {p.firstName[0]}
                {p.lastName[0]}
              </Text>
            </View>
            <Text style={styles.picksName} numberOfLines={1}>
              {p.firstName}
            </Text>
            <Text style={styles.picksPick}>
              {p.predHome}–{p.predAway}
            </Text>
            <Text style={styles.picksPts}>
              {p.projectedPoints}
              <Text style={styles.picksPtsSmall}> pts</Text>
            </Text>
          </View>
          {p.finishType && <Text style={styles.picksFinish}>🏁 {FINISH_LABEL[p.finishType]}</Text>}
          <PicksByTeam scorers={p.scorers} cards={p.cards} home={home} away={away} />
        </View>
      ))}
    </View>
  )
}

function PredictionCard({
  p,
  groupId,
  meId,
  onPress,
}: {
  p: MyPredictionItem
  groupId: string
  meId?: string
  onPress: () => void
}) {
  const bucket = bucketOf(p.status)
  const [expanded, setExpanded] = useState(false)
  const hasResult = p.actualHome !== null && p.actualAway !== null
  const exact = hasResult && p.predHome === p.actualHome && p.predAway === p.actualAway
  const points = p.isScored ? p.points : hasResult ? p.projectedPoints : null
  const canReveal = bucket !== 'upcoming'

  return (
    <View style={[styles.card, bucket === 'live' && styles.cardLive, bucket === 'finished' && styles.cardFinished]}>
      <TouchableOpacity style={styles.cardBody} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.top}>
          <Text style={styles.round}>{p.round}</Text>
          <Text style={styles.when}>{formatKickoff(p.kickoffUtc)}</Text>
          {bucket === 'live' && (
            <View style={styles.flagLive}>
              <View style={styles.liveDot} />
              <Text style={styles.flagLiveText}>LIVE</Text>
            </View>
          )}
          {bucket === 'finished' && (
            <View style={styles.flagFt}>
              <Text style={styles.flagFtText}>FT</Text>
            </View>
          )}
        </View>

        <View style={styles.fixture}>
          <View style={styles.side}>
            <Image source={{ uri: p.homeTeam.logoUrl }} style={styles.logo} resizeMode="contain" />
            <Text style={styles.code}>{p.homeTeam.code}</Text>
          </View>
          <View style={styles.scores}>
            <View style={styles.scoreline}>
              <Text style={styles.scoreTag}>PICK</Text>
              <Text style={[styles.score, exact && styles.scoreExact]}>
                {p.predHome}–{p.predAway}
              </Text>
            </View>
            {hasResult && (
              <View style={styles.scoreline}>
                <Text style={styles.scoreTag}>REAL</Text>
                <Text style={[styles.score, styles.scoreActual]}>
                  {p.actualHome}–{p.actualAway}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.side, styles.sideRight]}>
            <Text style={styles.code}>{p.awayTeam.code}</Text>
            <Image source={{ uri: p.awayTeam.logoUrl }} style={styles.logo} resizeMode="contain" />
          </View>
        </View>

        <View style={{ marginTop: 11 }}>
          <PicksByTeam scorers={p.scorers} cards={p.cards} home={p.homeTeam} away={p.awayTeam} />
        </View>

        <View style={styles.foot}>
          {exact && <Text style={styles.exactBadge}>✓ Exact score</Text>}
          {points !== null ? (
            <Text style={styles.points}>
              <Text style={[styles.pointsStrong, !p.isScored && styles.pointsProj]}>
                {points >= 0 ? '+' : ''}
                {points}
              </Text>{' '}
              pts {!p.isScored && <Text style={styles.pointsLive}>LIVE</Text>}
            </Text>
          ) : (
            <Text style={styles.pointsPending}>Awaiting kickoff</Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.revealBtn}
        onPress={() => canReveal && setExpanded((v) => !v)}
        disabled={!canReveal}
      >
        <Icon
          name={canReveal ? (expanded ? 'chevronUp' : 'chevronDown') : 'lock'}
          size={14}
          color={expanded ? colors.accent : colors.textMuted}
        />
        <Text style={[styles.revealText, expanded && { color: colors.accent }]}>
          {canReveal ? (expanded ? 'Hide group picks' : 'Show group picks') : 'Group picks reveal at kickoff'}
        </Text>
      </TouchableOpacity>

      {expanded && canReveal && (
        <GroupPicksPanel matchId={p.matchId} groupId={groupId} meId={meId} home={p.homeTeam} away={p.awayTeam} />
      )}
    </View>
  )
}

export default function PicksTab({
  groupId,
  onMatchClick,
}: {
  groupId: string
  onMatchClick: (matchId: number, openDetail: boolean) => void
}) {
  const user = useAuthStore((s) => s.user)
  const [items, setItems] = useState<MyPredictionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [finishedLimit, setFinishedLimit] = useState(3)
  const [loadingMore, setLoadingMore] = useState(false)
  const [stats, setStats] = useState({ finishedTotal: 0, totalPicks: 0, totalPoints: 0, exactCount: 0 })

  const load = useCallback(async () => {
    try {
      const data = await getMyPredictions(groupId, finishedLimit)
      setItems(data.items)
      setStats({
        finishedTotal: data.finishedTotal,
        totalPicks: data.totalPicks,
        totalPoints: data.totalPoints,
        exactCount: data.exactCount,
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [groupId, finishedLimit])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!items.some((i) => LIVE_STATUSES.includes(i.status))) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [items, load])

  if (loading) return <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />

  if (stats.totalPicks === 0) {
    return (
      <View style={styles.empty}>
        <Icon name="target" size={40} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No picks yet</Text>
        <Text style={styles.emptySub}>Head to Matches and place your first pick</Text>
      </View>
    )
  }

  const order: Bucket[] = ['live', 'upcoming', 'finished']
  const labels: Record<Bucket, string> = { live: 'Live now', upcoming: 'Upcoming', finished: 'Finished' }
  const grouped = order
    .map((b) => {
      let list = items.filter((i) => bucketOf(i.status) === b)
      if (b === 'finished')
        list = [...list].sort((a, c) => new Date(c.kickoffUtc).getTime() - new Date(a.kickoffUtc).getTime())
      return { bucket: b, list }
    })
    .filter((g) => g.list.length > 0)

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <View style={styles.summary}>
        {[
          [stats.totalPoints, 'Points'],
          [stats.totalPicks, 'Picks'],
          [stats.exactCount, 'Exact'],
        ].map(([num, label]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statNum}>{num}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {grouped.map(({ bucket, list }) => {
        const isFinished = bucket === 'finished'
        const hasMore = isFinished && stats.finishedTotal > list.length
        return (
          <View key={bucket} style={{ marginBottom: 22 }}>
            <View style={styles.groupLabel}>
              <Text style={styles.groupLabelText}>{labels[bucket].toUpperCase()}</Text>
              <View style={styles.groupCount}>
                <Text style={styles.groupCountText}>{isFinished ? stats.finishedTotal : list.length}</Text>
              </View>
            </View>
            {list.map((p) => (
              <PredictionCard
                key={p.matchId}
                p={p}
                groupId={groupId}
                meId={user?.id}
                onPress={() =>
                  onMatchClick(p.matchId, LIVE_STATUSES.includes(p.status) || FINISHED_STATUSES.includes(p.status))
                }
              />
            ))}
            {hasMore && (
              <TouchableOpacity
                style={styles.loadMore}
                disabled={loadingMore}
                onPress={() => {
                  setLoadingMore(true)
                  setFinishedLimit((n) => n + 3)
                }}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  summary: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  statNum: { fontFamily: fonts.heading, fontSize: 26, color: colors.accent },
  statLabel: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 1, color: colors.textMuted, textTransform: 'uppercase' },

  groupLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  groupLabelText: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 1.4, color: colors.textMuted },
  groupCount: { backgroundColor: colors.surface2, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  groupCountText: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardLive: { borderColor: 'rgba(239, 83, 80, 0.35)' },
  cardFinished: { opacity: 0.92 },
  cardBody: { padding: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  round: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  when: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginLeft: 'auto' },
  flagLive: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef5350' },
  flagLiveText: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.6, color: '#ef5350' },
  flagFt: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  flagFtText: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },

  fixture: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  sideRight: { justifyContent: 'flex-end' },
  logo: { width: 28, height: 28 },
  code: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  scores: { alignItems: 'center', gap: 3 },
  scoreline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreTag: { fontFamily: fonts.body, fontSize: 8, letterSpacing: 1, color: colors.textMuted, width: 26 },
  score: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  scoreExact: { color: colors.accent },
  scoreActual: { fontSize: 14, color: colors.textMuted },

  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, minHeight: 18 },
  exactBadge: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.accent, letterSpacing: 0.4 },
  points: { fontFamily: fonts.body, fontSize: 13, color: colors.text, marginLeft: 'auto' },
  pointsStrong: { fontFamily: fonts.heading, fontSize: 16, color: colors.accent },
  pointsProj: { color: colors.text },
  pointsLive: { fontSize: 9, letterSpacing: 0.6, color: '#ef5350' },
  pointsPending: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginLeft: 'auto' },

  revealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface2,
  },
  revealText: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.4, color: colors.textMuted },

  panel: { padding: 10, backgroundColor: colors.surface2 },
  panelHint: { padding: 14, textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  panelHiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    backgroundColor: colors.surface2,
  },
  picksRow: { paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 },
  picksRowMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  picksAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  picksAvatarText: { fontFamily: fonts.bodySemiBold, fontSize: 9, color: colors.accent },
  picksName: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.text },
  picksPick: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  picksPts: { fontFamily: fonts.heading, fontSize: 16, color: colors.accent, textAlign: 'right' },
  picksPtsSmall: { fontFamily: fonts.body, fontSize: 9, color: colors.textMuted },
  picksFinish: { fontFamily: fonts.body, fontSize: 10, letterSpacing: 0.4, color: colors.textMuted, textTransform: 'uppercase' },

  loadMore: {
    marginTop: 2,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
  },
  loadMoreText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accent },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginTop: 16, marginBottom: 8 },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
})
