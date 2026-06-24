import { useEffect, useMemo, useState } from 'react'
import {
  BRACKET, ROUND_ORDER, ROUND_LABEL, classifySlot,
  type ResolvedSlot, type KnockoutRound, type BracketMatch,
} from '../data/bracket'
import type { StandingGroup, TeamInfo } from '../types'

interface Props {
  standings: StandingGroup[]
  teams: TeamInfo[]
}

// Collapses to true on narrow screens, where the tree becomes one-round-per-tab.
function useIsNarrow(maxWidth = 760) {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width:${maxWidth}px)`).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${maxWidth}px)`)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [maxWidth])
  return narrow
}

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
)
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
)

function Slot({ slot }: { slot: ResolvedSlot }) {
  const resolved = !!slot.teamName
  return (
    <div className={`bkt-slot ${resolved ? 'bkt-slot--team' : 'bkt-slot--tbd'}`}>
      {slot.logoUrl
        ? <img src={slot.logoUrl} className="bkt-logo" alt="" />
        : <span className="bkt-logo bkt-logo--ph" />}
      <span className="bkt-slot-name">{slot.teamName ?? slot.label}</span>
    </div>
  )
}

type Resolver = (raw: string) => ResolvedSlot

function MatchCard({ m, resolve, final, hl }: { m: BracketMatch; resolve: Resolver; final?: boolean; hl?: boolean }) {
  return (
    <div className={`bkt-match ${final ? 'bkt-match--final' : ''} ${hl ? 'bkt-match--hl' : ''}`}>
      <Slot slot={resolve(m.team1)} />
      <div className="bkt-match-mid">
        <span className="bkt-match-num">#{m.num}</span>
        <span className="bkt-match-date">
          {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <Slot slot={resolve(m.team2)} />
    </div>
  )
}

const REF_RE = /^[WL](\d+)$/

export default function Bracket({ standings, teams }: Props) {
  const narrow = useIsNarrow()
  const [activeRound, setActiveRound] = useState<KnockoutRound>('Round of 32')
  // Matches highlighted after a forward/back jump (the tie a pair feeds, or the pair a tie comes from).
  const [highlight, setHighlight] = useState<number[]>([])

  // Winner-bracket links: which match number a given match feeds into.
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
    [m.team1, m.team2].map(t => t.match(/^W(\d+)$/)?.[1]).filter(Boolean).map(Number)

  const goRound = (r: KnockoutRound, hl: number[] = []) => {
    setHighlight(hl)
    setActiveRound(r)
  }

  const resolve: Resolver = useMemo(() => {
    const byGroup = new Map<string, { name: string; logo: string }>()
    for (const g of standings) {
      const gm = g.groupName.match(/^Group ([A-L])$/)
      if (!gm) continue
      for (const r of g.rows) byGroup.set(`${gm[1]}${r.rank}`, { name: r.teamName, logo: r.logoUrl })
    }
    const byName = new Map<string, { name: string; logo: string }>()
    for (const t of teams) byName.set(t.name.toLowerCase(), { name: t.name, logo: t.logoUrl })
    return (raw: string) => classifySlot(
      raw,
      (group, rank) => byGroup.get(`${group}${rank}`),
      name => byName.get(name.toLowerCase()),
    )
  }, [standings, teams])

  // The skeleton is in match-number order, not bracket order. Walk the tree from the Final
  // down its W## feeders so each round's matches sit in true top-to-bottom order — that's what
  // makes the connector lines join the right pairs.
  const roundMatches = useMemo(() => {
    const byNum = new Map(BRACKET.map(m => [m.num, m]))
    const rank = new Map<number, number>()
    let leaf = 0
    const dfs = (num: number) => {
      const m = byNum.get(num)
      if (!m) return
      const feeders = [m.team1, m.team2]
        .map(t => t.match(REF_RE)?.[1]).filter(Boolean).map(Number)
      if (feeders.length === 0) { rank.set(num, leaf++); return }
      feeders.forEach(dfs)
      rank.set(num, feeders.reduce((s, n) => s + (rank.get(n) ?? 0), 0) / feeders.length)
    }
    dfs(104) // Final
    const out: Record<KnockoutRound, BracketMatch[]> = {
      'Round of 32': [], 'Round of 16': [], 'Quarter-final': [],
      'Semi-final': [], 'Final': [], 'Match for third place': [],
    }
    for (const m of BRACKET) out[m.round].push(m)
    for (const r of ROUND_ORDER) out[r].sort((a, b) => (rank.get(a.num) ?? 0) - (rank.get(b.num) ?? 0))
    return out
  }, [])

  const thirdPlace = roundMatches['Match for third place'][0]

  // ── Mobile: one round per tab ──
  if (narrow) {
    // Consecutive pairs (in tree order) are the two matches whose winners meet next round.
    // Group them tightly and space the pairs apart so the bracket flow reads on a phone.
    const matches = roundMatches[activeRound]
    const pairs: BracketMatch[][] = []
    for (let i = 0; i < matches.length; i += 2) pairs.push(matches.slice(i, i + 2))

    const idx = ROUND_ORDER.indexOf(activeRound)
    const prevRound = idx > 0 ? ROUND_ORDER[idx - 1] : null
    const nextRound = idx < ROUND_ORDER.length - 1 ? ROUND_ORDER[idx + 1] : null

    return (
      <div className="bracket-wrap bracket-wrap--mobile">
        <div className="bkt-round-tabs">
          {ROUND_ORDER.map(r => (
            <button
              key={r}
              className={`bkt-round-tab ${activeRound === r ? 'bkt-round-tab--on' : ''}`}
              onClick={() => goRound(r)}
            >
              {r === 'Round of 32' ? 'R32' : r === 'Round of 16' ? 'R16'
                : r === 'Quarter-final' ? 'QF' : r === 'Semi-final' ? 'SF' : 'Final'}
            </button>
          ))}
        </div>
        <div className="bkt-round-list">
          {pairs.map((pair, i) => (
            <div key={i} className={`bkt-pair ${pair.length === 2 ? 'bkt-pair--joined' : ''}`}>
              {pair.map(m => (
                <div key={m.num} className={`bkt-mrow ${prevRound ? 'bkt-mrow--in' : ''}`}>
                  {prevRound && (
                    <button
                      className="bkt-nav bkt-nav--back"
                      onClick={() => goRound(prevRound, feedersOf(m))}
                      aria-label={`Back to ${ROUND_LABEL[prevRound]}`}
                    >
                      <ChevronLeft />
                    </button>
                  )}
                  <MatchCard m={m} resolve={resolve} final={activeRound === 'Final'} hl={highlight.includes(m.num)} />
                </div>
              ))}
              {nextRound && pair.length === 2 && (
                <button
                  className="bkt-nav bkt-nav--fwd"
                  onClick={() => {
                    const target = nextOf.get(pair[0].num)
                    goRound(nextRound, target ? [target] : [])
                  }}
                  aria-label={`On to ${ROUND_LABEL[nextRound]}`}
                >
                  <ChevronRight />
                </button>
              )}
            </div>
          ))}
          {activeRound === 'Final' && thirdPlace && (
            <div className="bkt-third-block">
              <div className="bkt-third-tag">3rd place play-off</div>
              <MatchCard m={thirdPlace} resolve={resolve} />
            </div>
          )}
        </div>
        <p className="bracket-hint">Tap the arrows to follow winners forward · or back to the round that feeds in</p>
      </div>
    )
  }

  // ── Desktop: connected tree ──
  return (
    <div className="bracket-wrap">
      <div className="bracket-scroll bracket-tree">
        {ROUND_ORDER.map(round => (
          <div key={round} className="bkt-col">
            <div className="bkt-col-head">{ROUND_LABEL[round]}</div>
            <div className="bkt-col-body">
              {roundMatches[round].map(m => (
                <div key={m.num} className="bkt-cell">
                  <MatchCard m={m} resolve={resolve} final={round === 'Final'} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {thirdPlace && (
        <div className="bkt-third-block bkt-third-block--desktop">
          <div className="bkt-third-tag">3rd place play-off</div>
          <MatchCard m={thirdPlace} resolve={resolve} />
        </div>
      )}
      <p className="bracket-hint">Group slots fill in as standings settle · winners advance once knockout matches are played</p>
    </div>
  )
}
