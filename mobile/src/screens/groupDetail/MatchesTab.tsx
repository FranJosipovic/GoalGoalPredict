import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { getMatches } from '../../api/matches'
import { getStandings } from '../../api/tournament'
import { getTeams } from '../../api/teams'
import { colors, fonts, radius } from '../../theme'
import Icon from '../../components/Icon'
import Bracket from '../../components/Bracket'
import type { MatchListItem, StandingGroup, TeamInfo } from '../../types'

const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

const formatKickoff = (utc: string) =>
  new Date(utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
const formatKickoffDate = (utc: string) =>
  new Date(utc).toLocaleDateString([], { day: '2-digit', month: 'short' })
const formatDate = (utc: string) =>
  new Date(utc).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
const isToday = (utc: string) => new Date(utc).toDateString() === new Date().toDateString()

type Filter = 'today' | 'upcoming' | 'finished' | 'all'

function MatchCard({ match, onPress }: { match: MatchListItem; onPress: () => void }) {
  const { t } = useTranslation()
  const isLive = LIVE_STATUSES.includes(match.status)
  const isFinished = FINISHED_STATUSES.includes(match.status)
  const hasPred = match.myPrediction !== null

  return (
    <TouchableOpacity
      style={[styles.card, isLive && styles.cardLive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {isLive && (
        <View style={styles.liveCorner}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>{t('groupDetail.live')}</Text>
          </View>
          <View style={styles.livePulse} />
        </View>
      )}

      <View style={[styles.teams, isLive && { paddingTop: 18 }]}>
        <View style={styles.team}>
          <Image source={{ uri: match.homeTeam.logoUrl }} style={styles.logo} resizeMode="contain" />
          <Text style={styles.code}>{match.homeTeam.code}</Text>
        </View>

        <View style={styles.center}>
          {isLive ? (
            <View style={styles.scoreLive}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNum}>{match.homeGoals ?? 0}</Text>
                <Text style={styles.scoreSep}>:</Text>
                <Text style={styles.scoreNum}>{match.awayGoals ?? 0}</Text>
              </View>
              <Text style={styles.elapsed}>{match.elapsedMinutes}'</Text>
            </View>
          ) : isFinished ? (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreFinal}>{match.homeGoals}</Text>
              <Text style={styles.scoreSep}>:</Text>
              <Text style={styles.scoreFinal}>{match.awayGoals}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.kickoffTime}>{formatKickoff(match.kickoffUtc)}</Text>
              <Text style={styles.kickoffLabel}>{formatKickoffDate(match.kickoffUtc)}</Text>
            </View>
          )}
        </View>

        <View style={[styles.team, styles.teamAway]}>
          <Text style={styles.code}>{match.awayTeam.code}</Text>
          <Image source={{ uri: match.awayTeam.logoUrl }} style={styles.logo} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.round} numberOfLines={1}>
          {match.round}
        </Text>
        {hasPred ? (
          <View style={[styles.predBadge, styles.predBadgeSet]}>
            <Text style={styles.predBadgeSetText}>
              {match.myPrediction!.homeGoals}:{match.myPrediction!.awayGoals}
              {isFinished && match.myPrediction!.totalPoints !== null
                ? `  +${match.myPrediction!.totalPoints}pt`
                : ''}
            </Text>
          </View>
        ) : (
          !isFinished &&
          !isLive && (
            <View style={[styles.predBadge, styles.predBadgeEmpty]}>
              <Text style={styles.predBadgeEmptyText}>{t('groupDetail.noPrediction')}</Text>
            </View>
          )
        )}
        {isFinished && (
          <View style={styles.ftBadge}>
            <Text style={styles.ftBadgeText}>{t('groupDetail.ft')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function MatchesTab({
  groupId,
  isGlobal,
  onMatchClick,
}: {
  groupId: string
  isGlobal?: boolean
  onMatchClick: (matchId: number, openDetail: boolean) => void
}) {
  const { t: tr } = useTranslation()
  const [matches, setMatches] = useState<MatchListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [finishedLimit, setFinishedLimit] = useState(3)
  const [finishedTotal, setFinishedTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  // Global group only: knockout bracket vs upcoming fixtures sub-view.
  const [view, setView] = useState<'bracket' | 'upcoming'>('bracket')
  const [standings, setStandings] = useState<StandingGroup[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  // The bracket needs EVERY finished knockout fixture to resolve winners/scores,
  // so it fetches the full list (no finished-history paging, unlike the list view).
  const [bracketMatches, setBracketMatches] = useState<MatchListItem[]>([])

  useEffect(() => {
    if (!isGlobal) return
    Promise.all([
      getStandings().catch(() => []),
      getTeams().catch(() => []),
      getMatches(groupId).then((r) => r.matches).catch(() => [] as MatchListItem[]),
    ]).then(([s, t, m]) => {
      setStandings(s)
      setTeams(t)
      setBracketMatches(m)
    })
  }, [isGlobal, groupId])

  const load = useCallback(async () => {
    try {
      const data = await getMatches(groupId, finishedLimit)
      setMatches(data.matches)
      setFinishedTotal(data.finishedTotal)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }, [groupId, finishedLimit])

  useEffect(() => {
    load()
  }, [load])

  // Auto-refresh every 30s while any match is live.
  useEffect(() => {
    if (!matches.some((m) => LIVE_STATUSES.includes(m.status))) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [matches, load])

  if (loading) return <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />

  const filtered = matches.filter((m) => {
    if (filter === 'today') return isToday(m.kickoffUtc) || LIVE_STATUSES.includes(m.status)
    if (filter === 'upcoming') return m.status === 'NS'
    if (filter === 'finished') return FINISHED_STATUSES.includes(m.status)
    return true
  })

  const byKickoffDesc = (a: MatchListItem, b: MatchListItem) =>
    new Date(b.kickoffUtc).getTime() - new Date(a.kickoffUtc).getTime()
  const ordered = [...filtered]
  if (filter === 'today') {
    ordered.sort((a, b) => {
      const al = LIVE_STATUSES.includes(a.status) ? 1 : 0
      const bl = LIVE_STATUSES.includes(b.status) ? 1 : 0
      if (al !== bl) return bl - al
      return byKickoffDesc(a, b)
    })
  } else if (filter === 'finished') {
    ordered.sort(byKickoffDesc)
  }

  const loadedFinished = matches.filter((m) => FINISHED_STATUSES.includes(m.status)).length
  const hasMoreFinished = (filter === 'finished' || filter === 'all') && finishedTotal > loadedFinished

  const grouped = ordered.reduce<Record<string, MatchListItem[]>>((acc, m) => {
    const key = formatDate(m.kickoffUtc)
    ;(acc[key] ??= []).push(m)
    return acc
  }, {})

  const liveMatches = matches.filter((m) => LIVE_STATUSES.includes(m.status))
  const groups = Object.entries(grouped)

  const listView = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            load()
          }}
          tintColor={colors.accent}
        />
      }
    >
      {/* Filter pills */}
      <View style={styles.filters}>
        {(['today', 'upcoming', 'finished', 'all'] as Filter[]).map((f) => {
          const active = filter === f
          return (
            <TouchableOpacity
              key={f}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {f === 'today' ? tr('groupDetail.filterToday') : f === 'upcoming' ? tr('groupDetail.filterUpcoming') : f === 'finished' ? tr('groupDetail.filterFinished') : tr('groupDetail.filterAll')}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {liveMatches.length > 0 && (
        <TouchableOpacity style={styles.liveBanner} onPress={() => onMatchClick(liveMatches[0].id, true)}>
          <View style={styles.liveBannerDot} />
          <Text style={styles.liveBannerText}>
            {tr('groupDetail.liveNow', { count: liveMatches.length })}
          </Text>
          <Icon name="chevronRight" size={16} color={colors.error} />
        </TouchableOpacity>
      )}

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>{tr('groupDetail.noMatchesTitle')}</Text>
          <Text style={styles.emptySub}>{tr('groupDetail.noMatchesSub')}</Text>
        </View>
      ) : (
        groups.map(([date, dayMatches]) => (
          <View key={date} style={styles.dayGroup}>
            <Text style={styles.dayLabel}>{isToday(dayMatches[0].kickoffUtc) ? tr('groupDetail.filterToday').toUpperCase() : date.toUpperCase()}</Text>
            {dayMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                onPress={() =>
                  onMatchClick(m.id, LIVE_STATUSES.includes(m.status) || FINISHED_STATUSES.includes(m.status))
                }
              />
            ))}
          </View>
        ))
      )}

      {hasMoreFinished && (
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
            <Text style={styles.loadMoreText}>{tr('groupDetail.loadMore')}</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  )

  if (!isGlobal) return listView

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subSwitch}>
        {(['bracket', 'upcoming'] as const).map((v) => {
          const on = view === v
          return (
            <TouchableOpacity key={v} style={[styles.subBtn, on && styles.subBtnOn]} onPress={() => setView(v)}>
              <Text style={[styles.subText, on && styles.subTextOn]}>{v === 'bracket' ? tr('groupDetail.bracket') : tr('groupDetail.upcoming')}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      {view === 'bracket' ? (
        <Bracket standings={standings} teams={teams} matches={bracketMatches} onMatchClick={(id) => onMatchClick(id, true)} />
      ) : (
        listView
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  subSwitch: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  subBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  subBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  subText: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  subTextOn: { color: colors.onAccent },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'space-evenly' },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  pillTextActive: { color: colors.onAccent },

  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 60, 60, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.25)',
  },
  liveBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4444' },
  liveBannerText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },

  dayGroup: { marginBottom: 8 },
  dayLabel: { fontFamily: fonts.heading, fontSize: 11, letterSpacing: 2, color: colors.textMuted, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },

  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
  },
  cardLive: { borderColor: 'rgba(255, 68, 68, 0.3)', backgroundColor: 'rgba(255, 68, 68, 0.04)' },
  liveCorner: { position: 'absolute', top: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveBadge: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.25)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveBadgeText: { fontFamily: fonts.headingBold, fontSize: 10, letterSpacing: 1.5, color: '#ff4444' },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4444' },

  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  team: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  teamAway: { justifyContent: 'flex-end' },
  logo: { width: 28, height: 28 },
  code: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  center: { paddingHorizontal: 16 },
  scoreLive: { alignItems: 'center', gap: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreNum: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.accent },
  scoreFinal: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  scoreSep: { fontFamily: fonts.heading, fontSize: 18, color: colors.textMuted },
  elapsed: { fontSize: 11, color: '#ff6b6b', fontFamily: fonts.bodySemiBold, letterSpacing: 0.5 },
  kickoffTime: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  kickoffLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 1 },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: { fontSize: 11, color: colors.textMuted, flex: 1, fontFamily: fonts.body },
  predBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  predBadgeSet: { backgroundColor: colors.accentGlow, borderWidth: 1, borderColor: colors.borderSolid },
  predBadgeSetText: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent },
  predBadgeEmpty: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderSolid, borderStyle: 'dashed' },
  predBadgeEmptyText: { fontFamily: fonts.heading, fontSize: 13, color: colors.textMuted },
  ftBadge: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  ftBadgeText: { fontFamily: fonts.headingBold, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted },

  loadMore: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
  },
  loadMoreText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accent },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 44, marginBottom: 16 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: 8 },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
})
