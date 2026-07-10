import { useMemo, useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
  BRACKET,
  ROUND_ORDER,
  ROUND_LABEL,
  classifySlot,
  type ResolvedSlot,
  type KnockoutRound,
  type BracketMatch,
} from '../data/bracket'
import { colors, fonts, radius } from '../theme'
import Icon from './Icon'
import type { StandingGroup, TeamInfo, MatchListItem, TeamSummary } from '../types'

interface Props {
  standings: StandingGroup[]
  teams: TeamInfo[]
  matches?: MatchListItem[]
  onMatchClick?: (matchId: number) => void
}

const FINISHED_ST = ['FT', 'AET', 'PEN']
const LIVE_ST = ['1H', 'HT', '2H', 'ET', 'BT', 'P']
const REF_RE = /^[WL](\d+)$/

const ROUND_SHORT: Record<KnockoutRound, string> = {
  'Round of 32': 'R32',
  'Round of 16': 'R16',
  'Quarter-final': 'QF',
  'Semi-final': 'SF',
  Final: 'Final',
  'Match for third place': '3rd',
}

interface CardData {
  s1: ResolvedSlot
  s2: ResolvedSlot
  matchId?: number
  kickoffUtc?: string
  score1?: number | null
  score2?: number | null
  pen1?: number | null
  pen2?: number | null
  winner?: 1 | 2
  statusTag?: string
}

function skeletonRound(dbRound: string): KnockoutRound | null {
  const r = dbRound.toLowerCase()
  if (r.includes('32')) return 'Round of 32'
  if (r.includes('16')) return 'Round of 16'
  if (r.includes('quarter')) return 'Quarter-final'
  if (r.includes('semi')) return 'Semi-final'
  if (r.includes('3rd') || r.includes('third')) return 'Match for third place'
  if (r.includes('final')) return 'Final'
  return null
}

function Slot({ slot, score, pen, won }: { slot: ResolvedSlot; score?: number | null; pen?: number | null; won?: boolean }) {
  const resolved = !!slot.teamName
  return (
    <View style={[styles.slot, won && styles.slotWon]}>
      {slot.logoUrl ? (
        <Image source={{ uri: slot.logoUrl }} style={styles.slotLogo} resizeMode="contain" />
      ) : (
        <View style={styles.slotLogoPh} />
      )}
      <Text style={[styles.slotName, !resolved && styles.slotNameTbd, won && styles.slotNameWon]} numberOfLines={1}>
        {slot.teamName ?? slot.label}
      </Text>
      {pen != null && <Text style={[styles.slotPen, won && styles.slotScoreWon]}>({pen})</Text>}
      {score != null && <Text style={[styles.slotScore, won && styles.slotScoreWon]}>{score}</Text>}
    </View>
  )
}

function MatchCard({ card, m, final, hl, onOpen }: { card: CardData; m: BracketMatch; final?: boolean; hl?: boolean; onOpen?: (id: number) => void }) {
  const clickable = card.matchId != null && !!onOpen
  const when = card.kickoffUtc
    ? new Date(card.kickoffUtc).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return (
    <TouchableOpacity
      style={[styles.card, final && styles.cardFinal, hl && styles.cardHl]}
      activeOpacity={clickable ? 0.8 : 1}
      onPress={() => clickable && card.matchId != null && onOpen?.(card.matchId)}
      disabled={!clickable}
    >
      <View style={styles.cardHead}>
        <Text style={styles.cardTime}>{when}</Text>
        {!!card.statusTag && (
          <View style={styles.cardTag}>
            <Text style={styles.cardTagText}>{card.statusTag}</Text>
          </View>
        )}
      </View>
      <Slot slot={card.s1} score={card.score1} pen={card.pen1} won={card.winner === 1} />
      <Slot slot={card.s2} score={card.score2} pen={card.pen2} won={card.winner === 2} />
    </TouchableOpacity>
  )
}

export default function Bracket({ standings, teams, matches, onMatchClick }: Props) {
  const [activeRound, setActiveRound] = useState<KnockoutRound>('Round of 32')
  const [highlight, setHighlight] = useState<number[]>([])

  const nextOf = useMemo(() => {
    const map = new Map<number, number>()
    for (const m of BRACKET) {
      for (const t of [m.team1, m.team2]) {
        const w = t.match(/^W(\d+)$/)
        if (w) map.set(Number(w[1]), m.num)
      }
    }
    return map
  }, [])
  const feedersOf = (m: BracketMatch) =>
    [m.team1, m.team2].map((t) => t.match(/^W(\d+)$/)?.[1]).filter(Boolean).map(Number)

  const goRound = (r: KnockoutRound, hl: number[] = []) => {
    setHighlight(hl)
    setActiveRound(r)
  }

  const resolve = useMemo(() => {
    const byGroup = new Map<string, { name: string; logo: string }>()
    for (const g of standings) {
      const gm = g.groupName.match(/^Group ([A-L])$/)
      if (!gm) continue
      for (const r of g.rows) byGroup.set(`${gm[1]}${r.rank}`, { name: r.teamName, logo: r.logoUrl })
    }
    const byName = new Map<string, { name: string; logo: string }>()
    for (const t of teams) byName.set(t.name.toLowerCase(), { name: t.name, logo: t.logoUrl })
    return (raw: string) =>
      classifySlot(
        raw,
        (group, rank) => byGroup.get(`${group}${rank}`),
        (name) => byName.get(name.toLowerCase())
      )
  }, [standings, teams])

  const fixturesByRound = useMemo(() => {
    const map = new Map<KnockoutRound, MatchListItem[]>()
    for (const m of matches ?? []) {
      const r = skeletonRound(m.round)
      if (!r) continue
      ;(map.get(r) ?? map.set(r, []).get(r)!).push(m)
    }
    return map
  }, [matches])

  const cardByNum = useMemo(() => {
    const toSlot = (t: TeamSummary): ResolvedSlot => ({ kind: 'team', label: t.name, teamName: t.name, logoUrl: t.logoUrl })
    type Team = { name: string; logoUrl?: string }
    const slotTeam = (s: ResolvedSlot): Team => ({ name: s.teamName!, logoUrl: s.logoUrl })

    const winnerByNum = new Map<number, Team>()
    const loserByNum = new Map<number, Team>()
    const cards = new Map<number, CardData>()

    const resolveSlot = (raw: string): ResolvedSlot => {
      const w = raw.match(/^W(\d+)$/)
      if (w && winnerByNum.has(Number(w[1]))) {
        const t = winnerByNum.get(Number(w[1]))!
        return { kind: 'winner', label: raw, teamName: t.name, logoUrl: t.logoUrl }
      }
      const l = raw.match(/^L(\d+)$/)
      if (l && loserByNum.has(Number(l[1]))) {
        const t = loserByNum.get(Number(l[1]))!
        return { kind: 'loser', label: raw, teamName: t.name, logoUrl: t.logoUrl }
      }
      return resolve(raw)
    }

    const order: KnockoutRound[] = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Match for third place', 'Final']
    for (const round of order) {
      for (const m of BRACKET.filter((b) => b.round === round)) {
        let s1 = resolveSlot(m.team1)
        let s2 = resolveSlot(m.team2)
        const n1 = s1.teamName?.toLowerCase()
        const n2 = s2.teamName?.toLowerCase()

        let fx: MatchListItem | undefined
        let g1: number | null = null,
          g2: number | null = null
        let p1: number | null = null,
          p2: number | null = null
        if (n1 || n2) {
          for (const cand of fixturesByRound.get(m.round) ?? []) {
            const h = cand.homeTeam.name.toLowerCase()
            const a = cand.awayTeam.name.toLowerCase()
            const hit1 = !!n1 && (n1 === h || n1 === a)
            const hit2 = !!n2 && (n2 === h || n2 === a)
            if (!hit1 && !hit2) continue
            const swap = n1 === a || n2 === h
            s1 = toSlot(swap ? cand.awayTeam : cand.homeTeam)
            s2 = toSlot(swap ? cand.homeTeam : cand.awayTeam)
            g1 = swap ? cand.awayGoals : cand.homeGoals
            g2 = swap ? cand.homeGoals : cand.awayGoals
            p1 = (swap ? cand.penaltyAwayGoals : cand.penaltyHomeGoals) ?? null
            p2 = (swap ? cand.penaltyHomeGoals : cand.penaltyAwayGoals) ?? null
            fx = cand
            break
          }
        }

        const card: CardData = { s1, s2 }
        if (fx) {
          card.matchId = fx.id
          card.kickoffUtc = fx.kickoffUtc
          const finished = FINISHED_ST.includes(fx.status)
          const live = LIVE_ST.includes(fx.status)
          if ((finished || live) && g1 != null && g2 != null) {
            card.score1 = g1
            card.score2 = g2
            if (finished) {
              card.statusTag = fx.status === 'PEN' ? 'Pens' : fx.status === 'AET' ? 'AET' : 'FT'
              if (fx.status === 'PEN') {
                card.pen1 = p1
                card.pen2 = p2
              }
              const w1 = g1 > g2 || (g1 === g2 && p1 != null && p2 != null && p1 > p2)
              const w2 = g2 > g1 || (g1 === g2 && p1 != null && p2 != null && p2 > p1)
              if (w1) {
                card.winner = 1
                winnerByNum.set(m.num, slotTeam(s1))
                loserByNum.set(m.num, slotTeam(s2))
              } else if (w2) {
                card.winner = 2
                winnerByNum.set(m.num, slotTeam(s2))
                loserByNum.set(m.num, slotTeam(s1))
              }
            } else {
              card.statusTag = fx.elapsedMinutes != null ? `${fx.elapsedMinutes}'` : 'LIVE'
            }
          }
        }
        cards.set(m.num, card)
      }
    }
    return cards
  }, [resolve, fixturesByRound])

  const cardData = (m: BracketMatch): CardData => cardByNum.get(m.num) ?? { s1: resolve(m.team1), s2: resolve(m.team2) }

  const roundMatches = useMemo(() => {
    const byNum = new Map(BRACKET.map((m) => [m.num, m]))
    const rank = new Map<number, number>()
    let leaf = 0
    const dfs = (num: number) => {
      const m = byNum.get(num)
      if (!m) return
      const feeders = [m.team1, m.team2].map((t) => t.match(REF_RE)?.[1]).filter(Boolean).map(Number)
      if (feeders.length === 0) {
        rank.set(num, leaf++)
        return
      }
      feeders.forEach(dfs)
      rank.set(num, feeders.reduce((s, n) => s + (rank.get(n) ?? 0), 0) / feeders.length)
    }
    dfs(104)
    const out: Record<KnockoutRound, BracketMatch[]> = {
      'Round of 32': [],
      'Round of 16': [],
      'Quarter-final': [],
      'Semi-final': [],
      Final: [],
      'Match for third place': [],
    }
    for (const m of BRACKET) out[m.round].push(m)
    for (const r of ROUND_ORDER) out[r].sort((a, b) => (rank.get(a.num) ?? 0) - (rank.get(b.num) ?? 0))
    return out
  }, [])

  const thirdPlace = roundMatches['Match for third place'][0]
  const roundMs = roundMatches[activeRound]
  const pairs: BracketMatch[][] = []
  for (let i = 0; i < roundMs.length; i += 2) pairs.push(roundMs.slice(i, i + 2))

  const idx = ROUND_ORDER.indexOf(activeRound)
  const prevRound = idx > 0 ? ROUND_ORDER[idx - 1] : null
  const nextRound = idx < ROUND_ORDER.length - 1 ? ROUND_ORDER[idx + 1] : null

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        {ROUND_ORDER.map((r) => {
          const on = activeRound === r
          return (
            <TouchableOpacity key={r} style={[styles.tab, on && styles.tabOn]} onPress={() => goRound(r)}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{ROUND_SHORT[r]}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {pairs.map((pair, i) => {
          const joined = pair.length === 2 && !!nextRound
          return (
            <View key={i} style={[styles.pair, joined && styles.pairJoined]}>
              {pair.map((m) => (
                <View key={m.num} style={styles.mrow}>
                  {prevRound && (
                    <>
                      <TouchableOpacity style={styles.navBtn} onPress={() => goRound(prevRound, feedersOf(m))}>
                        <Icon name="chevronLeft" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                      <View style={styles.backStub} />
                    </>
                  )}
                  <View style={{ flex: 1 }}>
                    <MatchCard card={cardData(m)} m={m} final={activeRound === 'Final'} hl={highlight.includes(m.num)} onOpen={onMatchClick} />
                  </View>
                </View>
              ))}

              {joined && (
                <>
                  {/* ┤ connector: two horizontal stubs from each card into a vertical spine. */}
                  <View style={[styles.hStub, styles.hStubTop]} />
                  <View style={[styles.hStub, styles.hStubBottom]} />
                  <View style={styles.spine} />
                  <TouchableOpacity
                    style={styles.fwdBtn}
                    onPress={() => {
                      const target = nextOf.get(pair[0].num)
                      goRound(nextRound!, target ? [target] : [])
                    }}
                  >
                    <Icon name="chevronRight" size={15} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )
        })}

        {activeRound === 'Final' && thirdPlace && (
          <View style={styles.thirdBlock}>
            <Text style={styles.thirdTag}>3rd place play-off</Text>
            <MatchCard card={cardData(thirdPlace)} m={thirdPlace} onOpen={onMatchClick} />
          </View>
        )}

        <Text style={styles.hint}>Arrows follow winners forward · or back to the round that feeds in</Text>
      </ScrollView>
    </View>
  )
}

const SPINE_RIGHT = 22 // x of the vertical spine (from pair's right edge)
const LINE = colors.borderSolid

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  tabOn: { backgroundColor: colors.accentGlow, borderColor: colors.borderSolid },
  tabText: { fontFamily: fonts.heading, fontSize: 13, color: colors.textMuted },
  tabTextOn: { color: colors.accent },

  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 32, gap: 34 },

  pair: { gap: 12, position: 'relative' },
  pairJoined: { paddingRight: 42 },
  mrow: { flexDirection: 'row', alignItems: 'center' },
  navBtn: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  backStub: { width: 10, height: 2, backgroundColor: LINE },

  // Connector spine + stubs (absolute within the pair).
  spine: { position: 'absolute', right: SPINE_RIGHT, top: '25%', bottom: '25%', width: 2, backgroundColor: LINE },
  hStub: { position: 'absolute', right: SPINE_RIGHT, width: 20, height: 2, backgroundColor: LINE },
  hStubTop: { top: '25%' },
  hStubBottom: { bottom: '25%' },
  fwdBtn: { position: 'absolute', right: SPINE_RIGHT - 12, top: '50%', marginTop: -13, width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 2 },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8, gap: 4 },
  cardFinal: { borderColor: 'rgba(245, 197, 66, 0.5)' },
  cardHl: { borderColor: colors.accent },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minHeight: 12 },
  cardTime: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, letterSpacing: 0.4 },
  cardTag: { backgroundColor: colors.accentGlow, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  cardTagText: { fontFamily: fonts.headingBold, fontSize: 9, letterSpacing: 0.5, color: colors.accent, textTransform: 'uppercase' },

  slot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6 },
  slotWon: { backgroundColor: colors.accentGlow },
  slotLogo: { width: 18, height: 18 },
  slotLogoPh: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.border },
  slotName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.text },
  slotNameTbd: { color: colors.textMuted, fontFamily: fonts.body, fontStyle: 'italic' },
  slotNameWon: { color: colors.text, fontFamily: fonts.bodySemiBold },
  slotPen: { fontFamily: fonts.heading, fontSize: 11, color: colors.textMuted },
  slotScore: { fontFamily: fonts.headingBold, fontSize: 13, color: colors.text, minWidth: 14, textAlign: 'right' },
  slotScoreWon: { color: colors.accent },

  thirdBlock: { gap: 6 },
  thirdTag: { fontFamily: fonts.heading, fontSize: 10, letterSpacing: 1, color: colors.textMuted, textTransform: 'uppercase' },
  hint: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
})
