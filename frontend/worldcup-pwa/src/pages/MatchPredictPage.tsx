import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import PredictionPitch, { type PlayerBadge } from '../components/PredictionPitch'
import avatarPlaceholder from '../assets/avatar-placeholder.svg'
import PlayerStats from '../components/PlayerStats'
import Icon, { FootballCard } from '../components/Icon'
import { getMatchDetail, getMyPrediction, upsertPrediction, getCopyablePrediction, type CopyablePrediction } from '../api/matches'
import { getGroupRules } from '../api/groups'
import { getTeamSquad } from '../api/teams'
import { useCountdown } from '../hooks/useCountdown'
import { useCompetitionTheme } from '../hooks/useCompetitionTheme'
import type { MatchDetail, Player, GroupScoringRules, FinishType } from '../types'

const GHOST_POSITIONS = ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Midfielder', 'Forward', 'Forward', 'Forward']
const ghostPlayers = (teamId: number) =>
  GHOST_POSITIONS.map((pos, i) => ({
    playerId: -(teamId * 100 + i),
    name: '???',
    position: pos,
    shirtNumber: i + 1,
    isStarting: true,
    teamId,
    photoUrl: avatarPlaceholder,
  }))

// Positions arrive as full names ("Goalkeeper"/"Attacker") or short codes ("G"/"F").
const POS_LETTER = (pos: string) => {
  const p = (pos[0] ?? 'M').toUpperCase()
  return p === 'A' ? 'F' : p
}
const POS_RANK = (pos: string) => ['G', 'D', 'M', 'F'].indexOf(POS_LETTER(pos))
const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

type Side = 'home' | 'away'
type GoalType = 'Normal Goal' | 'Penalty' | 'Own Goal'
// `side` is which team's tally this goal counts toward. For a Normal/Penalty the scorer is on
// that team; for an Own Goal the scorer is on the OTHER team (an own goal feeds the opponent).
type ScorerSel = { playerId: number; goalType: GoalType; side: Side }

type ExtraCat = 'Yellow' | 'Red' | 'MissedPenalty'
type ExtraSel = { playerId: number; category: ExtraCat }

const EXTRA_LABELS: Record<ExtraCat, string> = {
  Yellow: 'Yellow card', Red: 'Red card', MissedPenalty: 'Missed penalty',
}
const EXTRA_ICONS: Record<ExtraCat, string> = {
  Yellow: '🟨', Red: '🟥', MissedPenalty: '❌',
}
const CARD_KIND: Record<ExtraCat, string> = { Yellow: 'Yellow', Red: 'Red', MissedPenalty: 'MissedPenalty' }

// Modern SVG icon for each card/penalty category — used in the prediction sheets so they
// match the rest of the app's line-icon set instead of the legacy emoji (kept in EXTRA_ICONS
// only for the compact inline label strings).
function ExtraIcon({ cat, size = 18 }: { cat: ExtraCat; size?: number }) {
  if (cat === 'Yellow') return <FootballCard color="yellow" size={size} />
  if (cat === 'Red') return <FootballCard color="red" size={size} />
  return <Icon name="close" size={size} />
}

// Builds the editable form state from a stored/copied prediction, mapping each pick to the
// right side and dropping picks disabled by (or no longer fitting) the current group's rules.
type PredLike = { homeGoals: number; awayGoals: number; scorers: { playerId: number; goalType: string }[]; cards: { playerId: number; kind: string }[] }
function buildPredictionForm(pred: PredLike, homePlayers: Player[], rules: GroupScoringRules | null) {
  const homeIds = new Set(homePlayers.map(p => p.id))
  const built: ScorerSel[] = pred.scorers.map(s => {
    const playerIsHome = homeIds.has(s.playerId)
    if (s.goalType === 'Own Goal') {
      return { playerId: s.playerId, goalType: 'Own Goal' as const, side: (playerIsHome ? 'away' : 'home') as Side }
    }
    // "A goal is a goal" — historic Penalty picks now collapse into a plain goal.
    return {
      playerId: s.playerId,
      goalType: 'Normal Goal' as GoalType,
      side: (playerIsHome ? 'home' : 'away') as Side,
    }
  })
  const builtEnabled = built.filter(s =>
    s.goalType === 'Own Goal' ? (rules?.ownGoalEnabled ?? true) : (rules?.goalscorerEnabled ?? true))
  let hLeft = pred.homeGoals, aLeft = pred.awayGoals
  const scorers = builtEnabled.filter(s => {
    if (s.side === 'home') { if (hLeft > 0) { hLeft--; return true } return false }
    if (aLeft > 0) { aLeft--; return true } return false
  })
  const cardEnabled = (cat: ExtraCat) =>
    cat === 'Yellow' ? (rules?.yellowCardEnabled ?? true)
    : cat === 'Red' ? (rules?.redCardEnabled ?? true)
    : (rules?.missedPenaltyEnabled ?? true)
  const extras: ExtraSel[] = pred.cards
    .map(c => ({ playerId: c.playerId, category: (c.kind === 'MissedPenalty' ? 'MissedPenalty' : c.kind) as ExtraCat }))
    .filter(e => cardEnabled(e.category))
  return { home: pred.homeGoals, away: pred.awayGoals, scorers, extras }
}

export default function MatchPredictPage() {
  const { groupId, matchId } = useParams<{ groupId: string; matchId: string }>()
  const navigate = useNavigate()
  useCompetitionTheme()

  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [rules, setRules] = useState<GroupScoringRules | null>(null)
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [homeGoals, setHomeGoals] = useState(0)
  const [awayGoals, setAwayGoals] = useState(0)
  const [scorers, setScorers] = useState<ScorerSel[]>([])
  const [extras, setExtras] = useState<ExtraSel[]>([])
  const [finishType, setFinishType] = useState<FinishType | null>(null)
  const [saved, setSaved] = useState<{ home: number; away: number; scorers: ScorerSel[]; extras: ExtraSel[]; finishType: FinishType | null } | null>(null)
  const [copyable, setCopyable] = useState<CopyablePrediction | null>(null)

  const [search, setSearch] = useState('')
  const [activeTeam, setActiveTeam] = useState<Side>('home')
  const [pickerMode, setPickerMode] = useState<'goal' | 'owngoal'>('goal')
  const [extraCat, setExtraCat] = useState<ExtraCat | null>(null)
  const [cardTeam, setCardTeam] = useState<Side>('home')
  const [sheetPlayerId, setSheetPlayerId] = useState<number | null>(null)
  const [sheetTab, setSheetTab] = useState<'predict' | 'stats'>('predict')
  // Pre-lineup squad picker: which player's stat card is open in a modal.
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null)

  const countdown = useCountdown(match?.kickoffUtc ?? '')
  const lineupCountdown = useCountdown(match?.lineupRevealUtc ?? '')
  const isLocked = match ? new Date(match.kickoffUtc) <= new Date() : false
  // Knockout ties (Round of 16, Quarter-final, …) carry an extra "how it ends" pick.
  const isKnockout = match ? !/^group/i.test(match.round) : false
  const finishEnabled = isKnockout && (rules ? rules.finishTypeEnabled : true)

  useEffect(() => {
    if (!matchId || !groupId) return
    Promise.all([
      getMatchDetail(Number(matchId)),
      getMyPrediction(Number(matchId), groupId),
      getGroupRules(groupId).catch(() => null),
    ]).then(async ([m, existing, r]) => {
      // Load squads first so we can resolve which side each pick counts toward.
      const [homeSquad, awaySquad] = await Promise.all([
        getTeamSquad(m.homeTeam.id),
        getTeamSquad(m.awayTeam.id),
      ])
      setHomePlayers(homeSquad.players)
      setAwayPlayers(awaySquad.players)
      setMatch(m)
      setRules(r)

      if (existing) {
        const f = buildPredictionForm(existing, homeSquad.players, r)
        setHomeGoals(f.home)
        setAwayGoals(f.away)
        setScorers(f.scorers)
        setExtras(f.extras)
        setFinishType(existing.finishType ?? null)
        setSaved({ home: f.home, away: f.away, scorers: f.scorers, extras: f.extras, finishType: existing.finishType ?? null })
      } else if (new Date(m.kickoffUtc) > new Date()) {
        // No prediction in this group yet — offer to copy from the earliest group where they did.
        const copy = await getCopyablePrediction(Number(matchId), groupId)
        if (copy) setCopyable(copy)
      }
    }).finally(() => setLoading(false))
  }, [matchId, groupId])

  // Refresh score / goals every 30s while the match is live
  useEffect(() => {
    if (!matchId || !match || !LIVE_STATUSES.includes(match.status)) return
    const t = setInterval(() => {
      getMatchDetail(Number(matchId)).then(setMatch).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [matchId, match])

  const posPoints = useCallback((pos: string) => {
    if (!rules) return 0
    switch (POS_LETTER(pos)) {
      case 'G': return rules.scorerGkPoints
      case 'D': return rules.scorerDefPoints
      case 'M': return rules.scorerMidPoints
      case 'F': return rules.scorerAttPoints
      default: return 0
    }
  }, [rules])

  // Which scorer-type picks the group rules currently allow (default true if rules not loaded).
  const scorerEnabled = rules ? rules.goalscorerEnabled : true
  const ownEnabled = rules ? rules.ownGoalEnabled : true
  const anyScorerEnabled = scorerEnabled || ownEnabled

  // Keep the picker mode valid as rules change (e.g. goalscorers disabled → force own-goal mode).
  useEffect(() => {
    if (pickerMode === 'goal' && !scorerEnabled) setPickerMode(ownEnabled ? 'owngoal' : 'goal')
    if (pickerMode === 'owngoal' && !ownEnabled) setPickerMode(scorerEnabled ? 'goal' : 'owngoal')
  }, [scorerEnabled, ownEnabled, pickerMode])

  const sidePicks = (side: Side) => scorers.filter(s => s.side === side)
  const homeFull = sidePicks('home').length >= homeGoals
  const awayFull = sidePicks('away').length >= awayGoals
  const activeFull = activeTeam === 'home' ? homeFull : awayFull

  // Add a pick to the active tally. In 'owngoal' mode the chosen player is from the opposing team.
  const addPick = useCallback((playerId: number) => {
    if (activeFull) return
    if (pickerMode === 'owngoal' ? !ownEnabled : !scorerEnabled) return
    const goalType: GoalType = pickerMode === 'owngoal' ? 'Own Goal' : 'Normal Goal'
    setScorers(prev => [...prev, { playerId, goalType, side: activeTeam }])
  }, [activeFull, pickerMode, activeTeam, ownEnabled, scorerEnabled])

  const removeScorerAt = (idx: number) =>
    setScorers(prev => prev.filter((_, i) => i !== idx))

  const handleScoreChange = (side: Side, val: number) => {
    const v = Math.max(0, Math.min(20, val))
    if (side === 'home') setHomeGoals(v); else setAwayGoals(v)
    // Trim picks for that tally if reduced
    const current = sidePicks(side)
    if (current.length > v) {
      let toRemove = current.length - v
      setScorers(prev => prev.filter(s => {
        if (toRemove > 0 && s.side === side) { toRemove--; return false }
        return true
      }))
    }
  }

  // ---- Extra (card) picks ----
  const extrasOf = (cat: ExtraCat) => extras.filter(e => e.category === cat)
  const capFor = (cat: ExtraCat): number => {
    if (!rules) return 0
    if (rules.cardPredictionMode === 'Single') return 1
    if (rules.cardPredictionMode === 'Net') return Infinity
    return cat === 'Yellow' ? rules.yellowCardMaxPicks
      : cat === 'Red' ? rules.redCardMaxPicks
      : rules.missedPenaltyMaxPicks
  }
  const toggleExtra = (playerId: number, cat: ExtraCat) => {
    setExtras(prev => {
      const exists = prev.some(e => e.category === cat && e.playerId === playerId)
      if (exists) return prev.filter(e => !(e.category === cat && e.playerId === playerId))
      if (prev.filter(e => e.category === cat).length >= capFor(cat)) return prev
      return [...prev, { playerId, category: cat }]
    })
  }

  // Missed-penalty prediction has been retired — only yellow/red cards are pickable now.
  const enabledCats: ExtraCat[] = rules ? ([
    rules.yellowCardEnabled && 'Yellow',
    rules.redCardEnabled && 'Red',
  ].filter(Boolean) as ExtraCat[]) : []

  // Prefill the form from the copyable prediction (rules-filtered); leaves it unsaved so the
  // user reviews and taps Save. Dismisses the prompt either way.
  const applyCopy = () => {
    if (!copyable) return
    const f = buildPredictionForm(copyable, homePlayers, rules)
    setHomeGoals(f.home)
    setAwayGoals(f.away)
    setScorers(f.scorers)
    setExtras(f.extras)
    setCopyable(null)
  }

  const handleSave = async () => {
    if (!match || !groupId || isLocked) return
    setSaving(true)
    setError('')
    try {
      // Never send picks for a category the owner has disabled (avoids a server rejection).
      const scorerInputs = scorers
        .filter(s => s.goalType === 'Own Goal' ? ownEnabled : scorerEnabled)
        .map(s => ({ playerId: s.playerId, goalType: s.goalType }))
      const cardInputs = extras
        .filter(e => enabledCats.includes(e.category))
        .map(e => ({ playerId: e.playerId, kind: CARD_KIND[e.category] }))
      await upsertPrediction({
        matchId: match.id, groupId, homeGoals, awayGoals,
        scorers: scorerInputs, cards: cardInputs,
        finishType: finishEnabled ? finishType : null,
      })
      navigate(`/groups/${groupId}/matches`)
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Failed to save prediction')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Layout showBack><div className="loading-state"><span className="loading-ball">⚽</span></div></Layout>
  if (!match) return <Layout showBack><div className="empty-state"><p>Match not found</p></div></Layout>

  const allSquad = [...homePlayers, ...awayPlayers]
  const nameOf = (id: number) => allSquad.find(p => p.id === id)?.name ?? 'Player'
  const surnameOf = (id: number) => nameOf(id).split(' ').pop()
  const playerOf = (id: number) => allSquad.find(p => p.id === id)

  // ---- Pitch-based predicting (only once the official XIs are revealed) ----
  const pitchMode = !isLocked && match.lineupsRevealed && match.lineup.length > 0
  const homeIdSet = new Set(homePlayers.map(p => p.id))
  const sideOf = (id: number): Side => homeIdSet.has(id) ? 'home' : 'away'
  const xiFor = (teamId: number) =>
    match.lineup.filter(l => l.isStarting && l.teamId === teamId)
  const benchFor = (teamId: number) =>
    match.lineup.filter(l => !l.isStarting && l.teamId === teamId)
  const activeTeamId = activeTeam === 'home' ? match.homeTeam.id : match.awayTeam.id

  const countGoals = (id: number, t: GoalType) =>
    scorers.filter(s => s.playerId === id && s.goalType === t).length

  // A normal/penalty goal feeds the scorer's own side; an own goal feeds the opponent.
  const goalSide = (id: number, t: GoalType): Side => {
    const owner = sideOf(id)
    if (t !== 'Own Goal') return owner
    return owner === 'home' ? 'away' : 'home'
  }

  // A side is "full" once it has as many named scorers as predicted goals.
  const sideFull = (side: Side) =>
    sidePicks(side).length >= (side === 'home' ? homeGoals : awayGoals)

  const addGoal = (id: number, t: GoalType) => {
    const side = goalSide(id, t)
    if (sideFull(side)) return   // capped by the predicted scoreline — set the score first
    setScorers(prev => [...prev, { playerId: id, goalType: t, side }])
  }

  const removeGoal = (id: number, t: GoalType) => {
    const side = goalSide(id, t)
    setScorers(prev => {
      const idx = prev.findIndex(s => s.playerId === id && s.goalType === t && s.side === side)
      return idx < 0 ? prev : prev.filter((_, i) => i !== idx)
    })
  }

  const badgesForPlayer = (id: number): PlayerBadge[] => {
    const out: PlayerBadge[] = []
    const n = countGoals(id, 'Normal Goal')
    const og = countGoals(id, 'Own Goal')
    if (n) out.push({ icon: '⚽', count: n })
    if (og) out.push({ icon: '🥅', count: og })
    for (const e of extras.filter(e => e.playerId === id)) out.push({ icon: EXTRA_ICONS[e.category] })
    return out
  }

  // Players to choose from in the picker, by tally + mode.
  const pickFromTeam = pickerMode === 'owngoal'
    ? (activeTeam === 'home' ? awayPlayers : homePlayers)   // own goal scorer is on the opposing team
    : (activeTeam === 'home' ? homePlayers : awayPlayers)
  const posOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']
  const pickList = pickFromTeam
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position))
  const scorerCountFor = (playerId: number) => scorers.filter(s => s.playerId === playerId).length

  const isLive = LIVE_STATUSES.includes(match.status)
  const isFinished = FINISHED_STATUSES.includes(match.status)
  const hasActual = match.homeGoals !== null && match.awayGoals !== null

  const timeline = [...match.goals].sort((a, b) => a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0))

  // ---- Live/final scoring projection mirroring the backend ScoringEngine ----
  let myScore: null | { lines: { label: string; pts: number }[]; total: number } = null
  if (isLocked && hasActual && rules) {
    const ah = match.homeGoals!, aa = match.awayGoals!
    const lines: { label: string; pts: number }[] = []
    const exact = homeGoals === ah && awayGoals === aa
    const outcome = !exact && Math.sign(homeGoals - awayGoals) === Math.sign(ah - aa)
    if (rules.exactScoreEnabled && exact) lines.push({ label: 'Exact score', pts: rules.exactScorePoints })
    else if (rules.outcomeEnabled && outcome) lines.push({ label: 'Correct outcome', pts: rules.outcomePoints })

    // "A goal is a goal": Normal Goal + Penalty bucket together per player; Own Goal is separate.
    const bucket = (type: string) => (type === 'Own Goal' ? 'Own Goal' : 'Goal')
    const remaining = new Map<string, number>()
    for (const g of match.goals) {
      if (g.scorerPlayerId == null) continue
      if (!['Normal Goal', 'Penalty', 'Own Goal'].includes(g.goalType)) continue
      const k = `${g.scorerPlayerId}|${bucket(g.goalType)}`
      remaining.set(k, (remaining.get(k) ?? 0) + 1)
    }
    const consume = (playerId: number, type: string) => {
      const k = `${playerId}|${bucket(type)}`
      const left = remaining.get(k) ?? 0
      if (left > 0) { remaining.set(k, left - 1); return true }
      return false
    }
    for (const s of scorers) {
      if (s.goalType === 'Own Goal') {
        if (rules.ownGoalEnabled && consume(s.playerId, 'Own Goal'))
          lines.push({ label: `🥅 ${nameOf(s.playerId)} (OG)`, pts: rules.ownGoalPoints })
      } else if (rules.goalscorerEnabled && consume(s.playerId, s.goalType)) {
        const pl = allSquad.find(p => p.id === s.playerId)
        lines.push({ label: `⚽ ${nameOf(s.playerId)}`, pts: posPoints(pl?.position ?? '') })
      }
    }

    const yellowSet = new Set(match.cards.filter(c => c.cardType === 'Yellow Card').map(c => c.playerId))
    const redSet = new Set(match.cards.filter(c => c.cardType === 'Red Card').map(c => c.playerId))
    const missedSet = new Set(match.goals.filter(g => g.goalType === 'Missed Penalty').map(g => g.scorerPlayerId))
    const cardHit = (cat: ExtraCat, id: number) =>
      cat === 'Yellow' ? yellowSet.has(id) : cat === 'Red' ? redSet.has(id) : missedSet.has(id)
    const cardPts = (cat: ExtraCat) =>
      cat === 'Yellow' ? rules.yellowCardPoints : cat === 'Red' ? rules.redCardPoints : rules.missedPenaltyPoints
    for (const e of extras) {
      const enabled = e.category === 'Yellow' ? rules.yellowCardEnabled
        : e.category === 'Red' ? rules.redCardEnabled : rules.missedPenaltyEnabled
      if (!enabled) continue
      if (cardHit(e.category, e.playerId))
        lines.push({ label: `${EXTRA_ICONS[e.category]} ${nameOf(e.playerId)}`, pts: cardPts(e.category) })
      else if (rules.cardPredictionMode === 'Net')
        lines.push({ label: `${EXTRA_ICONS[e.category]} ${nameOf(e.playerId)} (miss)`, pts: -rules.wrongPickPenalty })
    }

    // Knockout finish (Regular / Extra time / Penalties) — judged from the final status.
    const FINISH_LABEL: Record<FinishType, string> = { Regular: 'Regular time', ExtraTime: 'Extra time', Penalties: 'Penalties' }
    const actualFinish: FinishType | null =
      match.status === 'FT' ? 'Regular' : match.status === 'AET' ? 'ExtraTime' : match.status === 'PEN' ? 'Penalties' : null
    if (finishEnabled && rules.finishTypeEnabled && finishType && actualFinish && finishType === actualFinish)
      lines.push({ label: `🏁 ${FINISH_LABEL[finishType]}`, pts: rules.finishTypePoints })

    myScore = { lines, total: lines.reduce((a, l) => a + l.pts, 0) }
  }

  const lineupsBlock = (
    <div className="lineup-reveal">
      <div className="lineup-reveal-head">
        <span className="section-label">CONFIRMED LINEUPS</span>
        {match.lineupsRevealed
          ? <span className="lineup-reveal-pill lineup-reveal-pill--live">● Official XI</span>
          : <span className="lineup-reveal-pill">🔒 30 min before KO</span>}
      </div>
      {match.lineupsRevealed && match.lineup.length > 0 ? (
        <div className="lineup-cols">
          {[match.homeTeam, match.awayTeam].map(team => {
            const xi = match.lineup
              .filter(l => l.teamId === team.id && l.isStarting)
              .sort((a, b) => POS_RANK(a.position) - POS_RANK(b.position))
            return (
              <div key={team.id} className="lineup-col">
                <div className="lineup-team-name">
                  <img src={team.logoUrl} className="lineup-team-logo" alt="" />
                  {team.code}
                </div>
                {xi.map(l => (
                  <div key={l.playerId} className="lineup-player">
                    <span className="lineup-num">{l.shirtNumber}</span>
                    <span className="lineup-name">{l.name}</span>
                    <span className="lineup-pos" data-pos={l.position[0]}>{l.position.slice(0, 3).toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          {/* Mobile: simple locked message */}
          <div className="lineup-locked lineup-locked--mobile">
            <span className="lineup-locked-icon">📋</span>
            <p className="lineup-locked-title">Lineups not out yet</p>
            <p className="lineup-locked-sub">
              {lineupCountdown
                ? <>Revealed in <strong>{lineupCountdown.d > 0 && `${lineupCountdown.d}d `}{String(lineupCountdown.h).padStart(2,'0')}:{String(lineupCountdown.m).padStart(2,'0')}:{String(lineupCountdown.s).padStart(2,'0')}</strong></>
                : 'Available 30 minutes before kickoff'}
            </p>
          </div>
          {/* Desktop: blurred ghost pitch with overlay message */}
          <div className="lineup-ghost-wrap lineup-ghost-wrap--desktop">
            <div className="lineup-ghost-pitch">
              <div className="lineup-ghost-home">
                <PredictionPitch
                  players={ghostPlayers(match.homeTeam.id)}
                  badgesFor={() => []}
                  onPlayerTap={() => {}}
                />
              </div>
              <div className="lineup-ghost-away">
                <PredictionPitch
                  players={ghostPlayers(match.awayTeam.id)}
                  badgesFor={() => []}
                  onPlayerTap={() => {}}
                />
              </div>
            </div>
            <div className="lineup-ghost-overlay">
              <span className="lineup-locked-icon">📋</span>
              <p className="lineup-locked-title">Lineups not out yet</p>
              <p className="lineup-locked-sub">
                {lineupCountdown
                  ? <>Revealed in <strong>{lineupCountdown.d > 0 && `${lineupCountdown.d}d `}{String(lineupCountdown.h).padStart(2,'0')}:{String(lineupCountdown.m).padStart(2,'0')}:{String(lineupCountdown.s).padStart(2,'0')}</strong></>
                  : 'Available 30 minutes before kickoff'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )

  const sameScorers = (a: ScorerSel[], b: ScorerSel[]) =>
    a.length === b.length &&
    [...a].map(s => `${s.side}:${s.playerId}:${s.goalType}`).sort().join(',') === [...b].map(s => `${s.side}:${s.playerId}:${s.goalType}`).sort().join(',')
  const sameExtras = (a: ExtraSel[], b: ExtraSel[]) =>
    a.length === b.length &&
    [...a].map(e => `${e.category}:${e.playerId}`).sort().join(',') === [...b].map(e => `${e.category}:${e.playerId}`).sort().join(',')
  const isDirty = !saved || saved.home !== homeGoals || saved.away !== awayGoals
    || !sameScorers(saved.scorers, scorers) || !sameExtras(saved.extras, extras)
    || saved.finishType !== finishType

  // Render one team's goal slots.
  const renderSlots = (side: Side) => {
    const code = side === 'home' ? match.homeTeam.code : match.awayTeam.code
    const goals = side === 'home' ? homeGoals : awayGoals
    const entries = sidePicks(side)
    return (
      <div className="slots-group">
        <span className="slots-label">{code}</span>
        <div className="slots-row">
          {Array.from({ length: goals }).map((_, i) => {
            const entry = entries[i]
            if (!entry) return <div key={i} className="slot"><span className="slot-empty">+</span></div>
            const globalIdx = scorers.indexOf(entry)
            const og = entry.goalType === 'Own Goal'
            return (
              <div key={i} className="slot slot--filled">
                <span className="slot-name">{surnameOf(entry.playerId)}</span>
                {og && <span className="slot-og" title="Own goal">OG</span>}
                <button className="slot-remove" onClick={() => removeScorerAt(globalIdx)} aria-label="Remove">✕</button>
              </div>
            )
          })}
          {goals === 0 && <span className="slots-empty-hint">Set {side} goals first</span>}
        </div>
      </div>
    )
  }

  return (
    <Layout title={isFinished ? 'Match' : isLive ? 'Live' : 'Prediction'} showBack>
      <div className="predict-page">
        {!isLocked && countdown && (
          <div className="predict-countdown">
            <span className="countdown-label">Locks in</span>
            <div className="countdown-values">
              {countdown.d > 0 && <><span className="cv">{countdown.d}</span><span className="cu">d</span></>}
              <span className="cv">{String(countdown.h).padStart(2,'0')}</span><span className="cu">h</span>
              <span className="cv">{String(countdown.m).padStart(2,'0')}</span><span className="cu">m</span>
              <span className="cv">{String(countdown.s).padStart(2,'0')}</span><span className="cu">s</span>
            </div>
          </div>
        )}
        {isLive && (
          <div className="predict-status predict-status--live">
            <span className="live-dot" /> LIVE · {match.elapsedMinutes ?? 0}&apos;
          </div>
        )}
        {isFinished && <div className="predict-status predict-status--ft">🏁 Match finished</div>}

        {!isLocked && copyable && (
          <div className="copy-pred">
            <div className="copy-pred-text">
              You already predicted this match in <strong>{copyable.sourceGroupName}</strong>. Copy those picks here?
            </div>
            <div className="copy-pred-actions">
              <button className="copy-pred-btn copy-pred-btn--no" onClick={() => setCopyable(null)}>No</button>
              <button className="copy-pred-btn copy-pred-btn--yes" onClick={applyCopy}>Copy picks</button>
            </div>
          </div>
        )}

        {/* SCORE */}
        {isLocked ? (
          <div className="ms-scoreboard">
            <div className="ms-team">
              <img src={match.homeTeam.logoUrl} className="ms-logo" alt="" />
              <span className="ms-team-name">{match.homeTeam.code}</span>
            </div>
            <div className="ms-score">
              <span className="ms-score-num">{match.homeGoals ?? 0}</span>
              <span className="ms-score-colon">:</span>
              <span className="ms-score-num">{match.awayGoals ?? 0}</span>
            </div>
            <div className="ms-team ms-team--right">
              <img src={match.awayTeam.logoUrl} className="ms-logo" alt="" />
              <span className="ms-team-name">{match.awayTeam.code}</span>
            </div>
          </div>
        ) : (
          <div className="score-picker-v2">
            <div className="score-team-label">
              <img src={match.homeTeam.logoUrl} className="stepper-logo" alt="" />
              <span className="stepper-team">{match.homeTeam.name}</span>
            </div>
            <div className="score-stepper-inline">
              <button className="stepper-btn stepper-btn--plus" onClick={() => handleScoreChange('home', homeGoals + 1)}>+</button>
              <span className="stepper-val">{homeGoals}</span>
              <button className="stepper-btn stepper-btn--minus" onClick={() => handleScoreChange('home', homeGoals - 1)} disabled={homeGoals === 0}>−</button>
            </div>
            <div className="score-colon">:</div>
            <div className="score-stepper-inline">
              <button className="stepper-btn stepper-btn--plus" onClick={() => handleScoreChange('away', awayGoals + 1)}>+</button>
              <span className="stepper-val">{awayGoals}</span>
              <button className="stepper-btn stepper-btn--minus" onClick={() => handleScoreChange('away', awayGoals - 1)} disabled={awayGoals === 0}>−</button>
            </div>
            <div className="score-team-label score-team-label--right">
              <img src={match.awayTeam.logoUrl} className="stepper-logo" alt="" />
              <span className="stepper-team">{match.awayTeam.name}</span>
            </div>
          </div>
        )}

        {/* KNOCKOUT FINISH — how the tie ends (knockout matches only) */}
        {!isLocked && finishEnabled && (
          <div className="finish-picker">
            <div className="finish-picker-head">
              <span className="scorer-title">HOW IT ENDS</span>
              <span className="scorer-sub">Score is judged after 120&apos; — guess the finish for {rules?.finishTypePoints ?? 3} pts.</span>
            </div>
            <div className="finish-seg">
              {([['Regular', 'Regular time'], ['ExtraTime', 'Extra time'], ['Penalties', 'Penalties']] as [FinishType, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`finish-seg-btn ${finishType === val ? 'finish-seg-btn--on' : ''}`}
                  onClick={() => setFinishType(finishType === val ? null : val)}
                >{label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Locked knockout finish — show the user's pick + outcome */}
        {isLocked && finishEnabled && finishType && (
          <div className="finish-locked">
            <span className="scorer-title">HOW IT ENDS</span>
            <span className="finish-locked-pick">
              You picked <strong>{finishType === 'Regular' ? 'Regular time' : finishType === 'ExtraTime' ? 'Extra time' : 'Penalties'}</strong>
            </span>
          </div>
        )}

        {!pitchMode && lineupsBlock}

        {/* GOALS & CARDS TIMELINE (locked only) */}
        {isLocked && (
          <div className="ms-section">
            <span className="section-label">GOALS</span>
            {timeline.length === 0 ? (
              <p className="ms-empty">No goals {isLive ? 'yet' : '— it finished goalless'}</p>
            ) : (
              <div className="goals-timeline">
                {timeline.map((g, i) => (
                  <div key={i} className={`goal-event ${g.teamId === match.homeTeam.id ? 'goal-event--home' : 'goal-event--away'}`}>
                    <span className="goal-min">{g.minute}{g.extraMinute ? `+${g.extraMinute}` : ''}&apos;</span>
                    <span className="goal-type-icon">{g.goalType === 'Penalty' ? '(P)' : g.goalType === 'Own Goal' ? '(OG)' : g.goalType === 'Missed Penalty' ? '(✗P)' : '⚽'}</span>
                    <span className="goal-scorer">{g.scorerName ?? 'Unknown'}</span>
                  </div>
                ))}
              </div>
            )}
            {match.cards.length > 0 && (
              <div className="cards-timeline">
                {[...match.cards].sort((a, b) => a.minute - b.minute).map((c, i) => (
                  <div key={i} className="card-event">
                    <span className="goal-min">{c.minute}{c.extraMinute ? `+${c.extraMinute}` : ''}&apos;</span>
                    <span className="card-chip">{c.cardType === 'Red Card' ? '🟥' : '🟨'}</span>
                    <span className="goal-scorer">{c.playerName ?? 'Unknown'}</span>
                  </div>
                ))}
              </div>
            )}
            {match.substitutions.length > 0 && (
              <div className="subs-timeline">
                <span className="section-label">SUBSTITUTIONS</span>
                {[...match.substitutions]
                  .sort((a, b) => a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0))
                  .map((s, i) => (
                    <div key={i} className="sub-event">
                      <span className="goal-min">{s.minute}{s.extraMinute ? `+${s.extraMinute}` : ''}&apos;</span>
                      <span className="sub-in">🟢 {s.playerInName ?? 'Unknown'}</span>
                      <span className="sub-out">🔴 {s.playerOutName ?? 'Unknown'}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* MY POINTS */}
        {isLocked && (
          <div className="ms-section ms-mypoints">
            <div className="ms-mypoints-head">
              <span className="section-label">YOUR PREDICTION</span>
              <span className="ms-mypoints-total">{myScore ? myScore.total : 0} pts{isLive && myScore ? <em> live</em> : ''}</span>
            </div>
            <div className="ms-pred-line">You picked <strong>{homeGoals}–{awayGoals}</strong></div>
            {myScore && (
              <div className="ms-breakdown">
                {myScore.lines.length === 0
                  ? <div className="ms-bd-row"><span>No points yet</span><span className="ms-bd-miss">—</span></div>
                  : myScore.lines.map((l, i) => (
                      <div key={i} className="ms-bd-row">
                        <span>{l.label}</span>
                        <span className={l.pts >= 0 ? 'ms-bd-win' : 'ms-bd-miss'}>{l.pts >= 0 ? `+${l.pts}` : l.pts}</span>
                      </div>
                    ))}
              </div>
            )}
          </div>
        )}

        {/* EDITOR */}
        {!isLocked && (
          <>
            {anyScorerEnabled && (
            <div className="scorer-section">
              <div className="scorer-header">
                <span className="scorer-title">GOALSCORERS</span>
                <span className="scorer-sub">
                  {scorerEnabled
                    ? `Who scores each goal — ${homeGoals} ${match.homeTeam.code}, ${awayGoals} ${match.awayTeam.code}.`
                    : 'Goalscorers are off — only own goals score in this group.'}
                </span>
              </div>
              <div className="scorer-slots">
                {renderSlots('home')}
                {renderSlots('away')}
              </div>
            </div>
            )}

            {/* Cards overview (pitch mode) — kept above the pitch so squads stay at the bottom */}
            {pitchMode && enabledCats.length > 0 && extras.length > 0 && (
              <div className="extra-section">
                <div className="scorer-header">
                  <span className="scorer-title">CARDS &amp; PENALTIES</span>
                </div>
                <div className="extra-chips">
                  {extras.map((e, i) => (
                    <span key={i} className="extra-chip" onClick={() => toggleExtra(e.playerId, e.category)}>
                      {EXTRA_ICONS[e.category]} {surnameOf(e.playerId)} ✕
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pitchMode && (
              <div className="pitch-predictor">
                <div className="picker-team-switch">
                  <button className={`picker-team-btn ${activeTeam === 'home' ? 'active' : ''}`} onClick={() => setActiveTeam('home')}>
                    {match.homeTeam.code} ({sidePicks('home').length}/{homeGoals})
                  </button>
                  <button className={`picker-team-btn ${activeTeam === 'away' ? 'active' : ''}`} onClick={() => setActiveTeam('away')}>
                    {match.awayTeam.code} ({sidePicks('away').length}/{awayGoals})
                  </button>
                </div>
                <PredictionPitch
                  players={xiFor(activeTeamId)}
                  bench={benchFor(activeTeamId)}
                  badgesFor={badgesForPlayer}
                  onPlayerTap={(id) => { setSheetPlayerId(id); setSheetTab('predict') }}
                />
                <p className="pitch-predictor-hint">Tap any player (including subs) to predict their goals &amp; cards</p>
              </div>
            )}

            {!pitchMode && anyScorerEnabled && (homeGoals > 0 || awayGoals > 0) && (
              <div className="player-picker">
                <div className="picker-team-switch">
                  <button className={`picker-team-btn ${activeTeam === 'home' ? 'active' : ''}`} onClick={() => { setActiveTeam('home'); setPickerMode(scorerEnabled ? 'goal' : 'owngoal') }}>
                    {match.homeTeam.code} ({sidePicks('home').length}/{homeGoals})
                  </button>
                  <button className={`picker-team-btn ${activeTeam === 'away' ? 'active' : ''}`} onClick={() => { setActiveTeam('away'); setPickerMode(scorerEnabled ? 'goal' : 'owngoal') }}>
                    {match.awayTeam.code} ({sidePicks('away').length}/{awayGoals})
                  </button>
                </div>

                <div className="picker-search-row">
                  <input className="field-input picker-search" placeholder="Search player..." value={search} onChange={e => setSearch(e.target.value)} />
                  {scorerEnabled && ownEnabled && (
                    <div className="picker-mode-switch">
                      <button className={`picker-mode-btn ${pickerMode === 'goal' ? 'on' : ''}`} onClick={() => setPickerMode('goal')}>
                        ⚽ Scored by {activeTeam === 'home' ? match.homeTeam.code : match.awayTeam.code}
                      </button>
                      <button className={`picker-mode-btn ${pickerMode === 'owngoal' ? 'on' : ''}`} onClick={() => setPickerMode('owngoal')}>
                        🥅 Own goal by {activeTeam === 'home' ? match.awayTeam.code : match.homeTeam.code}
                      </button>
                    </div>
                  )}
                </div>
                <div className="player-list-row">
                  <div className="player-list">
                    {pickList.map(p => {
                      const count = scorerCountFor(p.id)
                      return (
                        <div key={p.id} className="player-row-wrap">
                          <button type="button" className="player-stats-ico" onClick={() => setStatsPlayerId(p.id)} aria-label={`${p.name} statistics`}>
                            <Icon name="chart" size={16} />
                          </button>
                          <button className={`player-row ${count > 0 ? 'player-row--picked' : ''}`} onClick={() => addPick(p.id)} disabled={activeFull}>
                            <span className="player-num">#{p.shirtNumber}</span>
                            <span className="player-name">{p.name}</span>
                            <span className="player-pos-badge">{p.position.slice(0,3).toUpperCase()}</span>
                            <span className="player-pts">{pickerMode === 'owngoal' ? `${rules?.ownGoalPoints ?? 0}pt` : `${posPoints(p.position)}pt`}</span>
                            {count > 0 && <span className="player-count">×{count}</span>}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div className="player-stats-side">
                    {statsPlayerId != null ? (
                      <>
                        <div className="pp-sheet-head">
                          <Icon name="chart" size={18} className="pp-row-icon" />
                          <span className="pp-sheet-name">Player statistics</span>
                          <button className="pp-sheet-close" onClick={() => setStatsPlayerId(null)} aria-label="Close">✕</button>
                        </div>
                        <PlayerStats playerId={statsPlayerId} />
                      </>
                    ) : (
                      <div className="player-stats-empty">
                        <Icon name="chart" size={28} />
                        <p>Click the stats icon next to a player to view their impact</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SPECIAL PICKS (cards / missed pen) */}
            {!pitchMode && enabledCats.length > 0 && (
              <div className="extra-section">
                <div className="scorer-header">
                  <span className="scorer-title">CARDS &amp; PENALTIES</span>
                  <span className="scorer-sub">
                    {rules?.cardPredictionMode === 'Single' ? 'One pick per type'
                      : rules?.cardPredictionMode === 'Net' ? 'Unlimited — wrong picks cost points'
                      : 'Limited picks per type'}
                  </span>
                </div>
                <div className="extra-cats">
                  {enabledCats.map(cat => {
                    const picks = extrasOf(cat)
                    const cap = capFor(cat)
                    return (
                      <button
                        key={cat}
                        className={`extra-cat-btn ${extraCat === cat ? 'extra-cat-btn--on' : ''}`}
                        onClick={() => { setExtraCat(extraCat === cat ? null : cat); setSearch('') }}
                      >
                        {EXTRA_ICONS[cat]} {EXTRA_LABELS[cat]}
                        <span className="extra-cat-count">{picks.length}{cap !== Infinity ? `/${cap}` : ''}</span>
                      </button>
                    )
                  })}
                </div>

                {extras.length > 0 && (
                  <div className="extra-chips">
                    {extras.map((e, i) => (
                      <span key={i} className="extra-chip" onClick={() => toggleExtra(e.playerId, e.category)}>
                        {EXTRA_ICONS[e.category]} {surnameOf(e.playerId)} ✕
                      </span>
                    ))}
                  </div>
                )}

                {/* Player selection happens in a team-grouped bottom sheet (rendered at page end). */}
              </div>
            )}

            {error && <div className="error-msg" style={{ margin: '0 20px' }}>{error}</div>}

            <div className="predict-save">
              <button className="btn-primary" onClick={handleSave} disabled={saving || !isDirty} style={{ width: '100%' }}>
                {saving ? <span className="spinner" /> : !isDirty && saved ? 'Saved ✓' : 'Save Prediction'}
              </button>
            </div>
          </>
        )}

        {/* Card/penalty player picker — team-grouped bottom sheet (lineups-not-out mode) */}
        {!isLocked && !pitchMode && extraCat && (
          <div className="pp-sheet-overlay" onClick={() => setExtraCat(null)}>
            <div className="pp-sheet" onClick={e => e.stopPropagation()}>
              <div className="pp-sheet-head">
                <span className="pp-row-icon"><ExtraIcon cat={extraCat} /></span>
                <span className="pp-sheet-name">{EXTRA_LABELS[extraCat]}</span>
                <span className="extra-cat-count">
                  {extrasOf(extraCat).length}{capFor(extraCat) !== Infinity ? `/${capFor(extraCat)}` : ''}
                </span>
                <button type="button" className="pp-sheet-close" onClick={() => setExtraCat(null)} aria-label="Close">✕</button>
              </div>

              <div className="picker-team-switch">
                <button type="button" className={`picker-team-btn ${cardTeam === 'home' ? 'active' : ''}`} onClick={() => { setCardTeam('home'); setSearch('') }}>
                  {match.homeTeam.code || match.homeTeam.name}
                </button>
                <button type="button" className={`picker-team-btn ${cardTeam === 'away' ? 'active' : ''}`} onClick={() => { setCardTeam('away'); setSearch('') }}>
                  {match.awayTeam.code || match.awayTeam.name}
                </button>
              </div>

              <input
                className="field-input picker-search"
                placeholder="Search player..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              {(() => {
                const list = (cardTeam === 'home' ? homePlayers : awayPlayers)
                  .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                  .sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position))
                if (list.length === 0)
                  return <p className="ms-empty" style={{ padding: '12px 2px' }}>No players</p>
                return (
                  <div className="card-pick-scroll">
                    <div className="player-list">
                      {list.map(p => {
                        const picked = extras.some(e => e.category === extraCat && e.playerId === p.id)
                        const full = extrasOf(extraCat).length >= capFor(extraCat) && !picked
                        return (
                          <div key={p.id} className="player-row-wrap">
                            <button type="button" className="player-stats-ico" onClick={() => setStatsPlayerId(p.id)} aria-label={`${p.name} statistics`}>
                              <Icon name="chart" size={16} />
                            </button>
                            <button type="button" className={`player-row ${picked ? 'player-row--picked' : ''}`} onClick={() => toggleExtra(p.id, extraCat)} disabled={full}>
                              <span className="player-num">#{p.shirtNumber}</span>
                              <span className="player-name">{p.name}</span>
                              <span className="player-pos-badge">{p.position.slice(0,3).toUpperCase()}</span>
                              {picked && <span className="player-count">✓</span>}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <button type="button" className="pp-sheet-done" onClick={() => setExtraCat(null)}>Done</button>
            </div>
          </div>
        )}

        {/* Per-player prediction sheet (pitch mode) */}
        {pitchMode && sheetPlayerId != null && (() => {
          const pid = sheetPlayerId
          const pl = playerOf(pid)
          const oppCode = sideOf(pid) === 'home' ? match.awayTeam.code : match.homeTeam.code
          const goalRow = (icon: ReactNode, label: string, sub: string, type: GoalType) => {
            const full = sideFull(goalSide(pid, type))
            return (
              <div className="pp-row">
                <span className="pp-row-icon">{icon}</span>
                <span className="pp-row-text">
                  <span className="pp-row-label">{label}</span>
                  <span className="pp-row-sub">{full && countGoals(pid, type) === 0 ? 'set the score first' : sub}</span>
                </span>
                <span className="pp-stepper">
                  <button className="pp-step-btn" onClick={() => removeGoal(pid, type)} disabled={countGoals(pid, type) === 0}>−</button>
                  <span className="pp-step-val">{countGoals(pid, type)}</span>
                  <button className="pp-step-btn pp-step-btn--add" onClick={() => addGoal(pid, type)} disabled={full}>+</button>
                </span>
              </div>
            )
          }
          return (
            <div className="pp-sheet-overlay" onClick={() => setSheetPlayerId(null)}>
              <div className="pp-sheet" onClick={e => e.stopPropagation()}>
                <div className="pp-sheet-head">
                  <span className="pp-sheet-num">#{pl?.shirtNumber}</span>
                  <span className="pp-sheet-name">{pl?.name}</span>
                  <span className="player-pos-badge">{(pl?.position ?? '').slice(0, 3).toUpperCase()}</span>
                  <button className="pp-sheet-close" onClick={() => setSheetPlayerId(null)} aria-label="Close">✕</button>
                </div>

                <div className="pp-seg">
                  <button type="button" className={`pp-seg-btn ${sheetTab === 'predict' ? 'pp-seg-btn--on' : ''}`} onClick={() => setSheetTab('predict')}>Predict</button>
                  <button type="button" className={`pp-seg-btn ${sheetTab === 'stats' ? 'pp-seg-btn--on' : ''}`} onClick={() => setSheetTab('stats')}>Stats</button>
                </div>

                {sheetTab === 'stats' ? (
                  <PlayerStats playerId={pid} />
                ) : (
                  <>
                    {scorerEnabled && goalRow(<Icon name="ball" size={18} />, 'Goal', `${posPoints(pl?.position ?? '')} pt each`, 'Normal Goal')}
                    {ownEnabled && goalRow(<Icon name="net" size={18} />, 'Own goal', `counts for ${oppCode} · ${rules?.ownGoalPoints ?? 0} pt`, 'Own Goal')}

                    {enabledCats.length > 0 && (
                      <div className="pp-cards">
                        {enabledCats.map(cat => {
                          const on = extras.some(e => e.category === cat && e.playerId === pid)
                          const cap = capFor(cat)
                          const full = extrasOf(cat).length >= cap && !on
                          return (
                            <button
                              key={cat}
                              className={`pp-card-toggle ${on ? 'pp-card-toggle--on' : ''}`}
                              disabled={full}
                              onClick={() => toggleExtra(pid, cat)}
                            >
                              <ExtraIcon cat={cat} size={16} /> {EXTRA_LABELS[cat]}
                              <span className="pp-card-count">{extrasOf(cat).length}{cap !== Infinity ? `/${cap}` : ''}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                <button className="pp-sheet-done" onClick={() => setSheetPlayerId(null)}>Done</button>
              </div>
            </div>
          )
        })()}

        {/* Player statistics modal (pre-lineup squad picker) */}
        {statsPlayerId != null && (
          <div className="pp-sheet-overlay" onClick={() => setStatsPlayerId(null)}>
            <div className="pp-sheet pp-sheet--stats" onClick={e => e.stopPropagation()}>
              <div className="pp-sheet-head">
                <Icon name="chart" size={18} className="pp-row-icon" />
                <span className="pp-sheet-name">Player statistics</span>
                <button className="pp-sheet-close" onClick={() => setStatsPlayerId(null)} aria-label="Close">✕</button>
              </div>
              <PlayerStats playerId={statsPlayerId} />
              <button className="pp-sheet-done" onClick={() => setStatsPlayerId(null)}>Done</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
