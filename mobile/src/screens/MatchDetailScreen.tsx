import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMatchDetail, getMatchPredictions } from '../api/matches'
import { useAuthStore } from '../store/authStore'
import { colors, fonts, radius } from '../theme'
import Icon, { FootballCard, type IconName } from '../components/Icon'
import PredictionPitch, { type PlayerBadge } from '../components/PredictionPitch'
import PlayerStats from '../components/PlayerStats'
import PicksByTeam from '../components/PicksByTeam'
import type { MatchDetail, GroupPredictions, FinishType } from '../types'
import type { ScreenProps } from '../navigation'

type Tab = 'events' | 'lineups' | 'picks'
const MATCH_TABS: [Tab, IconName, string][] = [
  ['events', 'clipboard', 'Events'],
  ['lineups', 'shirt', 'Lineups'],
  ['picks', 'target', 'Picks'],
]
const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P']
const FINISHED = ['FT', 'AET', 'PEN']
const FINISH_LABEL: Record<FinishType, string> = {
  Regular: 'Regular time',
  ExtraTime: 'Extra time',
  Penalties: 'Penalties',
}
const lastName = (n: string) => n.split(' ').pop() ?? n

type Ev = {
  minute: number
  extraMinute: number | null
  teamId: number
  kind: 'goal' | 'card' | 'sub' | 'var'
  goalType?: string
  cardType?: string
  detail?: string
  main?: string | null
  inName?: string | null
  outName?: string | null
}

export function MatchDetailScreen({ route, navigation }: ScreenProps<'MatchDetail'>) {
  const { matchId, groupId } = route.params
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [preds, setPreds] = useState<GroupPredictions | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('events')
  const [lineupSide, setLineupSide] = useState<'home' | 'away'>('home')
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [m, p] = await Promise.all([
      getMatchDetail(matchId),
      getMatchPredictions(matchId, groupId).catch(() => null),
    ])
    setMatch(m)
    setPreds(p)
    setLoading(false)
  }, [matchId, groupId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!match || !LIVE.includes(match.status)) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [match, load])

  const Header = (
    <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
      <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
        <Icon name="back" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Match</Text>
      <View style={styles.headerBtn} />
    </View>
  )

  if (loading)
    return (
      <View style={styles.root}>
        {Header}
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      </View>
    )
  if (!match)
    return (
      <View style={styles.root}>
        {Header}
        <Text style={styles.emptyText}>Match not found</Text>
      </View>
    )

  const isLive = LIVE.includes(match.status)
  const isFinished = FINISHED.includes(match.status)
  const allPicks = [...(preds?.predictions ?? [])].sort((a, b) => b.projectedPoints - a.projectedPoints)

  const events: Ev[] = [
    ...match.goals.map((g) => ({ minute: g.minute, extraMinute: g.extraMinute, teamId: g.teamId, kind: 'goal' as const, goalType: g.goalType, main: g.scorerName })),
    ...match.cards.map((c) => ({ minute: c.minute, extraMinute: c.extraMinute, teamId: c.teamId, kind: 'card' as const, cardType: c.cardType, main: c.playerName })),
    ...match.substitutions.map((s) => ({ minute: s.minute, extraMinute: s.extraMinute, teamId: s.teamId, kind: 'sub' as const, inName: s.playerInName, outName: s.playerOutName })),
    ...(match.varDecisions ?? []).map((v) => ({ minute: v.minute, extraMinute: v.extraMinute, teamId: v.teamId, kind: 'var' as const, detail: v.detail, main: v.playerName })),
  ].sort((a, b) => a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0))

  const shootout = [...(match.shootoutPenalties ?? [])].sort((a, b) => a.order - b.order)
  const penHome = match.penaltyHomeGoals ?? shootout.filter((s) => s.teamId === match.homeTeam.id && s.scored).length
  const penAway = match.penaltyAwayGoals ?? shootout.filter((s) => s.teamId === match.awayTeam.id && s.scored).length

  // Lineup badge maps
  const hasLineup = match.lineup.length > 0
  const goalsByPlayer = new Map<number, number>()
  const ownGoalsByPlayer = new Map<number, number>()
  for (const g of match.goals) {
    if (g.scorerPlayerId == null) continue
    const map = g.goalType === 'Own Goal' ? ownGoalsByPlayer : goalsByPlayer
    if (['Normal Goal', 'Penalty', 'Own Goal'].includes(g.goalType))
      map.set(g.scorerPlayerId, (map.get(g.scorerPlayerId) ?? 0) + 1)
  }
  const yellowIds = new Set(match.cards.filter((c) => c.cardType === 'Yellow Card' && c.playerId != null).map((c) => c.playerId!))
  const redIds = new Set(match.cards.filter((c) => c.cardType === 'Red Card' && c.playerId != null).map((c) => c.playerId!))
  const subInIds = new Set(match.substitutions.filter((s) => s.playerInId != null).map((s) => s.playerInId!))
  const subOutIds = new Set(match.substitutions.filter((s) => s.playerOutId != null).map((s) => s.playerOutId!))

  const badgesFor = (playerId: number): PlayerBadge[] => {
    const out: PlayerBadge[] = []
    const g = goalsByPlayer.get(playerId) ?? 0
    const og = ownGoalsByPlayer.get(playerId) ?? 0
    if (g) out.push({ icon: <Icon name="ball" size={13} color="#fff" />, count: g })
    if (og) out.push({ icon: <Icon name="ball" size={13} color={colors.error} />, count: og })
    if (yellowIds.has(playerId)) out.push({ icon: <FootballCard color="yellow" size={12} /> })
    if (redIds.has(playerId)) out.push({ icon: <FootballCard color="red" size={12} /> })
    if (subOutIds.has(playerId)) out.push({ icon: <Icon name="arrowDown" size={12} color="#ef5350" /> })
    if (subInIds.has(playerId)) out.push({ icon: <Icon name="arrowUp" size={12} color="#4caf50" /> })
    return out
  }

  const lineupTeam = lineupSide === 'home' ? match.homeTeam : match.awayTeam
  const xiFor = (teamId: number) => match.lineup.filter((l) => l.teamId === teamId && l.isStarting)
  const benchFor = (teamId: number) => match.lineup.filter((l) => l.teamId === teamId && !l.isStarting)

  return (
    <View style={styles.root}>
      {Header}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Scoreboard */}
        <View style={styles.scoreboard}>
          <View style={styles.sbTeam}>
            <Image source={{ uri: match.homeTeam.logoUrl }} style={styles.sbLogo} resizeMode="contain" />
            <Text style={styles.sbName} numberOfLines={2}>
              {match.homeTeam.name}
            </Text>
          </View>
          <View style={styles.sbCenter}>
            <View style={styles.sbNums}>
              <Text style={styles.sbNum}>{match.homeGoals ?? '-'}</Text>
              <Text style={styles.sbColon}>:</Text>
              <Text style={styles.sbNum}>{match.awayGoals ?? '-'}</Text>
            </View>
            {isLive && (
              <View style={styles.sbLive}>
                <View style={styles.liveDot} />
                <Text style={styles.sbLiveText}>{match.elapsedMinutes}'</Text>
              </View>
            )}
            {isFinished && <Text style={styles.ftLabel}>FULL TIME</Text>}
            {shootout.length > 0 && (
              <Text style={styles.penLine}>
                Pens {penHome}–{penAway}
              </Text>
            )}
          </View>
          <View style={styles.sbTeam}>
            <Image source={{ uri: match.awayTeam.logoUrl }} style={styles.sbLogo} resizeMode="contain" />
            <Text style={styles.sbName} numberOfLines={2}>
              {match.awayTeam.name}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {MATCH_TABS.map(([t, icon, label]) => {
            const active = tab === t
            const color = active ? colors.accent : colors.textMuted
            return (
              <TouchableOpacity key={t} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t)}>
                <Icon name={icon} size={16} color={color} />
                <Text style={[styles.tabLabel, { color }]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Events */}
        {tab === 'events' &&
          (events.length === 0 && shootout.length === 0 ? (
            <Text style={styles.emptyText}>No events yet</Text>
          ) : (
            <View style={styles.timeline}>
              {events.map((e, i) => {
                const home = e.teamId === match.homeTeam.id
                return (
                  <View key={i} style={[styles.evRow, !home && styles.evRowAway]}>
                    <Text style={styles.evMin}>
                      {e.minute}
                      {e.extraMinute ? `+${e.extraMinute}` : ''}'
                    </Text>
                    <View style={styles.evIcon}>
                      {e.kind === 'goal' ? (
                        <View style={styles.evGoal}>
                          <Icon name="ball" size={15} color={colors.text} />
                          {e.goalType === 'Penalty' && <Text style={styles.evTag}>P</Text>}
                          {e.goalType === 'Own Goal' && <Text style={styles.evTag}>OG</Text>}
                        </View>
                      ) : e.kind === 'card' ? (
                        <FootballCard color={e.cardType === 'Red Card' ? 'red' : 'yellow'} size={15} />
                      ) : e.kind === 'var' ? (
                        <Icon
                          name={/disallow|cancel/i.test(e.detail ?? '') ? 'close' : 'whistle'}
                          size={15}
                          color={colors.textMuted}
                        />
                      ) : (
                        <View style={{ gap: 1 }}>
                          <Icon name="arrowUp" size={12} color="#4caf50" />
                          <Icon name="arrowDown" size={12} color="#ef5350" />
                        </View>
                      )}
                    </View>
                    <View style={[styles.evText, !home && styles.evTextAway]}>
                      {e.kind === 'sub' ? (
                        <>
                          <Text style={styles.evIn}>{e.inName ?? 'Unknown'}</Text>
                          <Text style={styles.evOut}>{e.outName ?? 'Unknown'}</Text>
                        </>
                      ) : e.kind === 'var' ? (
                        <>
                          <Text style={styles.evMain}>VAR: {e.detail}</Text>
                          {!!e.main && <Text style={styles.evOut}>{e.main}</Text>}
                        </>
                      ) : (
                        <Text style={styles.evMain}>{e.main ?? 'Unknown'}</Text>
                      )}
                    </View>
                  </View>
                )
              })}

              {shootout.length > 0 && (
                <>
                  <View style={styles.shootoutHead}>
                    <View style={styles.shootoutLabel}>
                      <Icon name="target" size={13} color={colors.textMuted} />
                      <Text style={styles.shootoutLabelText}>PENALTY SHOOTOUT</Text>
                    </View>
                    <Text style={styles.shootoutScore}>
                      {penHome}–{penAway}
                    </Text>
                  </View>
                  {shootout.map((s, i) => {
                    const home = s.teamId === match.homeTeam.id
                    return (
                      <View key={`pen${i}`} style={[styles.evRow, !home && styles.evRowAway]}>
                        <Text style={[styles.evMin, styles.evMinPen]}>P</Text>
                        <View style={styles.evIcon}>
                          <Text style={[styles.penMark, s.scored ? styles.penScored : styles.penMissed]}>
                            {s.scored ? '✓' : '✗'}
                          </Text>
                        </View>
                        <View style={[styles.evText, !home && styles.evTextAway]}>
                          <Text style={styles.evMain}>{lastName(s.playerName ?? 'Unknown')}</Text>
                        </View>
                      </View>
                    )
                  })}
                </>
              )}
            </View>
          ))}

        {/* Lineups */}
        {tab === 'lineups' &&
          (!hasLineup ? (
            <Text style={styles.emptyText}>Lineups not available yet</Text>
          ) : (
            <View style={styles.lineupTab}>
              <View style={styles.teamSwitch}>
                {(['home', 'away'] as const).map((side) => {
                  const active = lineupSide === side
                  const t = side === 'home' ? match.homeTeam : match.awayTeam
                  return (
                    <TouchableOpacity
                      key={side}
                      style={[styles.switchBtn, active && styles.switchBtnActive]}
                      onPress={() => setLineupSide(side)}
                    >
                      <Text style={[styles.switchText, active && styles.switchTextActive]}>{t.code || t.name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <PredictionPitch
                players={xiFor(lineupTeam.id)}
                bench={benchFor(lineupTeam.id)}
                badgesFor={badgesFor}
                onPlayerTap={setStatsPlayerId}
              />
              <Text style={styles.tapHint}>Tap a player for season statistics</Text>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <Icon name="ball" size={13} color={colors.text} />
                  <Text style={styles.legendText}>goal</Text>
                </View>
                <View style={styles.legendItem}>
                  <FootballCard color="yellow" size={12} />
                  <FootballCard color="red" size={12} />
                  <Text style={styles.legendText}>card</Text>
                </View>
                <View style={styles.legendItem}>
                  <Icon name="arrowDown" size={13} color="#ef5350" />
                  <Text style={styles.legendText}>off</Text>
                </View>
                <View style={styles.legendItem}>
                  <Icon name="arrowUp" size={13} color="#4caf50" />
                  <Text style={styles.legendText}>on</Text>
                </View>
              </View>
            </View>
          ))}

        {/* Picks */}
        {tab === 'picks' &&
          (allPicks.length === 0 ? (
            <Text style={styles.emptyText}>No predictions for this match</Text>
          ) : (
            <View style={{ padding: 16, gap: 16 }}>
              {allPicks.map((p) => {
                const isMe = p.userId === user?.id
                return (
                  <View key={p.userId} style={[styles.myPred, isMe && styles.myPredMe]}>
                    <View style={styles.myPredHead}>
                      <Text style={styles.myPredName}>
                        {p.firstName} {p.lastName}
                        {isMe ? ' (You)' : ''}
                      </Text>
                      <Text style={styles.myPredPts}>
                        {p.projectedPoints}
                        <Text style={styles.myPredPtsEm}> {isFinished ? 'pts' : 'proj'}</Text>
                      </Text>
                    </View>
                    <View style={styles.myPredScore}>
                      <Text style={styles.myPredCode}>{match.homeTeam.code || match.homeTeam.name}</Text>
                      <Text style={styles.myPredScoreNum}>
                        {p.predHome} : {p.predAway}
                      </Text>
                      <Text style={styles.myPredCode}>{match.awayTeam.code || match.awayTeam.name}</Text>
                    </View>
                    {p.finishType && <Text style={styles.myPredFinish}>🏁 {FINISH_LABEL[p.finishType]}</Text>}
                    <PicksByTeam scorers={p.scorers} cards={p.cards} home={match.homeTeam} away={match.awayTeam} />
                  </View>
                )
              })}
            </View>
          ))}
      </ScrollView>

      {/* Player stats sheet */}
      <Modal
        visible={statsPlayerId != null}
        transparent
        animationType="slide"
        onRequestClose={() => setStatsPlayerId(null)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setStatsPlayerId(null)}>
          <Pressable style={[styles.sheet, styles.sheetFlush]} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <Icon name="chart" size={18} color={colors.accent} />
              <Text style={styles.sheetTitle}>Player statistics</Text>
              <TouchableOpacity onPress={() => setStatsPlayerId(null)}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {statsPlayerId != null && <PlayerStats playerId={statsPlayerId} />}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 18, letterSpacing: 0.5, color: colors.text },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontFamily: fonts.body },

  scoreboard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  sbTeam: { alignItems: 'center', gap: 8, flex: 1 },
  sbLogo: { width: 52, height: 52 },
  sbName: { fontSize: 12, color: colors.textMuted, textAlign: 'center', fontFamily: fonts.body },
  sbCenter: { alignItems: 'center' },
  sbNums: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sbNum: { fontFamily: fonts.headingBold, fontSize: 44, color: colors.text },
  sbColon: { fontFamily: fonts.headingBold, fontSize: 40, color: colors.textMuted },
  sbLive: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4444' },
  sbLiveText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#ff6b6b' },
  ftLabel: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 2, color: colors.textMuted, marginTop: 4 },
  penLine: { fontFamily: fonts.heading, fontSize: 12, color: colors.text, marginTop: 4 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.accent },
  tabLabel: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  timeline: { paddingHorizontal: 20, paddingVertical: 8 },
  evRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  evRowAway: { flexDirection: 'row-reverse' },
  evMin: { fontFamily: fonts.heading, fontSize: 13, color: colors.accent, width: 40 },
  evMinPen: { color: colors.textMuted, fontSize: 11 },
  evIcon: { minWidth: 22, alignItems: 'center' },
  evGoal: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  evTag: { fontFamily: fonts.heading, fontSize: 9, color: colors.textMuted },
  evText: { flex: 1, gap: 2 },
  evTextAway: { alignItems: 'flex-end' },
  evMain: { fontSize: 14, color: colors.text, fontFamily: fonts.body },
  evIn: { fontSize: 14, color: '#4caf50', fontFamily: fonts.body },
  evOut: { fontSize: 13, color: '#ef5350', fontFamily: fonts.body },
  shootoutHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  shootoutLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shootoutLabelText: { fontFamily: fonts.heading, fontSize: 12, letterSpacing: 0.6, color: colors.textMuted },
  shootoutScore: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  penMark: { fontFamily: fonts.headingBold, fontSize: 14 },
  penScored: { color: '#36c275' },
  penMissed: { color: '#e5484d' },

  lineupTab: { paddingHorizontal: 16, paddingTop: 12 },
  teamSwitch: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  switchBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  switchBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  switchText: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  switchTextActive: { color: colors.onAccent },
  tapHint: { textAlign: 'center', marginTop: 10, fontSize: 12, color: colors.textMuted, fontFamily: fonts.body },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.body },

  myPred: { padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: 4 },
  myPredMe: { backgroundColor: colors.accentGlow, borderColor: colors.accentDim },
  myPredHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  myPredName: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 0.4, color: colors.text },
  myPredPts: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.accent },
  myPredPtsEm: { fontFamily: fonts.body, fontSize: 9, color: colors.textMuted },
  myPredScore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 6 },
  myPredCode: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.body },
  myPredScoreNum: { fontFamily: fonts.headingBold, fontSize: 24, color: colors.text },
  myPredFinish: { textAlign: 'center', fontSize: 11, letterSpacing: 0.4, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4, fontFamily: fonts.body },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16161d', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  sheetFlush: { paddingBottom: 18 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 14 },
  sheetTitle: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
})
