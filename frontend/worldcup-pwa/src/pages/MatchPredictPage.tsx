import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import NotificationToggle from '../components/NotificationToggle'
import { getMatchDetail, getMyPrediction, upsertPrediction } from '../api/matches'
import { getGroupRules } from '../api/groups'
import { getTeamSquad } from '../api/teams'
import { useCountdown } from '../hooks/useCountdown'
import type { MatchDetail, Player, GroupScoringRules } from '../types'

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

export default function MatchPredictPage() {
  const { groupId, matchId } = useParams<{ groupId: string; matchId: string }>()
  const navigate = useNavigate()

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
  const [saved, setSaved] = useState<{ home: number; away: number; scorers: ScorerSel[]; extras: ExtraSel[] } | null>(null)

  const [search, setSearch] = useState('')
  const [activeTeam, setActiveTeam] = useState<Side>('home')
  const [pickerMode, setPickerMode] = useState<'goal' | 'owngoal'>('goal')
  const [extraCat, setExtraCat] = useState<ExtraCat | null>(null)

  const countdown = useCountdown(match?.kickoffUtc ?? '')
  const lineupCountdown = useCountdown(match?.lineupRevealUtc ?? '')
  const isLocked = match ? new Date(match.kickoffUtc) <= new Date() : false

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
        const homeIds = new Set(homeSquad.players.map(p => p.id))
        const built: ScorerSel[] = existing.scorers.map(s => {
          const playerIsHome = homeIds.has(s.playerId)
          if (s.goalType === 'Own Goal') {
            // own goal feeds the opponent's tally
            return { playerId: s.playerId, goalType: 'Own Goal' as const, side: (playerIsHome ? 'away' : 'home') as Side }
          }
          return {
            playerId: s.playerId,
            goalType: (s.goalType === 'Penalty' ? 'Penalty' : 'Normal Goal') as GoalType,
            side: (playerIsHome ? 'home' : 'away') as Side,
          }
        })
        // Drop picks whose category has since been disabled in the group rules.
        const builtEnabled = built.filter(s =>
          s.goalType === 'Own Goal' ? (r?.ownGoalEnabled ?? true) : (r?.goalscorerEnabled ?? true))
        // Clamp each tally to the predicted goal count (drops stale picks that no longer fit).
        let hLeft = existing.homeGoals, aLeft = existing.awayGoals
        const sc = builtEnabled.filter(s => {
          if (s.side === 'home') { if (hLeft > 0) { hLeft--; return true } return false }
          if (aLeft > 0) { aLeft--; return true } return false
        })
        const cardEnabled = (cat: ExtraCat) =>
          cat === 'Yellow' ? (r?.yellowCardEnabled ?? true)
          : cat === 'Red' ? (r?.redCardEnabled ?? true)
          : (r?.missedPenaltyEnabled ?? true)
        const ex: ExtraSel[] = existing.cards
          .map(c => ({
            playerId: c.playerId,
            category: (c.kind === 'MissedPenalty' ? 'MissedPenalty' : c.kind) as ExtraCat,
          }))
          .filter(e => cardEnabled(e.category))
        setHomeGoals(existing.homeGoals)
        setAwayGoals(existing.awayGoals)
        setScorers(sc)
        setExtras(ex)
        setSaved({ home: existing.homeGoals, away: existing.awayGoals, scorers: sc, extras: ex })
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

  const setScorerType = (idx: number, goalType: GoalType) =>
    setScorers(prev => prev.map((s, i) => i === idx ? { ...s, goalType } : s))

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

  const enabledCats: ExtraCat[] = rules ? ([
    rules.yellowCardEnabled && 'Yellow',
    rules.redCardEnabled && 'Red',
    rules.missedPenaltyEnabled && 'MissedPenalty',
  ].filter(Boolean) as ExtraCat[]) : []

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

    const remaining = new Map<string, number>()
    for (const g of match.goals) {
      if (g.scorerPlayerId == null) continue
      if (!['Normal Goal', 'Penalty', 'Own Goal'].includes(g.goalType)) continue
      const k = `${g.scorerPlayerId}|${g.goalType}`
      remaining.set(k, (remaining.get(k) ?? 0) + 1)
    }
    const consume = (playerId: number, type: string) => {
      const k = `${playerId}|${type}`
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
        <div className="lineup-locked">
          <span className="lineup-locked-icon">📋</span>
          <p className="lineup-locked-title">Lineups not out yet</p>
          <p className="lineup-locked-sub">
            {lineupCountdown
              ? <>Revealed in <strong>{lineupCountdown.d > 0 && `${lineupCountdown.d}d `}{String(lineupCountdown.h).padStart(2,'0')}:{String(lineupCountdown.m).padStart(2,'0')}:{String(lineupCountdown.s).padStart(2,'0')}</strong></>
              : 'Available 30 minutes before kickoff'}
          </p>
        </div>
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
                {og ? (
                  <span className="slot-og" title="Own goal">OG</span>
                ) : (
                  <span className="slot-typeseg">
                    <button
                      className={`slot-seg ${entry.goalType === 'Normal Goal' ? 'slot-seg--on' : ''}`}
                      onClick={() => setScorerType(globalIdx, 'Normal Goal')}
                    >Goal</button>
                    <button
                      className={`slot-seg ${entry.goalType === 'Penalty' ? 'slot-seg--on' : ''}`}
                      onClick={() => setScorerType(globalIdx, 'Penalty')}
                    >Pen</button>
                  </span>
                )}
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

        <div className="predict-notif">
          <NotificationToggle />
        </div>

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

        {lineupsBlock}

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

            {anyScorerEnabled && (homeGoals > 0 || awayGoals > 0) && (
              <div className="player-picker">
                <div className="picker-team-switch">
                  <button className={`picker-team-btn ${activeTeam === 'home' ? 'active' : ''}`} onClick={() => { setActiveTeam('home'); setPickerMode(scorerEnabled ? 'goal' : 'owngoal') }}>
                    {match.homeTeam.code} ({sidePicks('home').length}/{homeGoals})
                  </button>
                  <button className={`picker-team-btn ${activeTeam === 'away' ? 'active' : ''}`} onClick={() => { setActiveTeam('away'); setPickerMode(scorerEnabled ? 'goal' : 'owngoal') }}>
                    {match.awayTeam.code} ({sidePicks('away').length}/{awayGoals})
                  </button>
                </div>

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

                <input className="field-input picker-search" placeholder="Search player..." value={search} onChange={e => setSearch(e.target.value)} />
                <div className="player-list">
                  {pickList.map(p => {
                    const count = scorerCountFor(p.id)
                    return (
                      <button key={p.id} className={`player-row ${count > 0 ? 'player-row--picked' : ''}`} onClick={() => addPick(p.id)} disabled={activeFull}>
                        <span className="player-num">#{p.shirtNumber}</span>
                        <span className="player-name">{p.name}</span>
                        <span className="player-pos-badge">{p.position.slice(0,3).toUpperCase()}</span>
                        <span className="player-pts">{pickerMode === 'owngoal' ? `${rules?.ownGoalPoints ?? 0}pt` : `${posPoints(p.position)}pt`}</span>
                        {count > 0 && <span className="player-count">×{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* SPECIAL PICKS (cards / missed pen) */}
            {enabledCats.length > 0 && (
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

                {extraCat && (
                  <div className="player-picker">
                    <input className="field-input picker-search" placeholder={`Search player for ${EXTRA_LABELS[extraCat]}...`} value={search} onChange={e => setSearch(e.target.value)} />
                    <div className="player-list">
                      {allSquad
                        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                        .sort((a, b) => posOrder.indexOf(a.position) - posOrder.indexOf(b.position))
                        .map(p => {
                          const picked = extras.some(e => e.category === extraCat && e.playerId === p.id)
                          const full = extrasOf(extraCat).length >= capFor(extraCat) && !picked
                          return (
                            <button key={p.id} className={`player-row ${picked ? 'player-row--picked' : ''}`} onClick={() => toggleExtra(p.id, extraCat)} disabled={full}>
                              <span className="player-num">#{p.shirtNumber}</span>
                              <span className="player-name">{p.name}</span>
                              <span className="player-pos-badge">{p.position.slice(0,3).toUpperCase()}</span>
                              {picked && <span className="player-count">✓</span>}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}
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
      </div>
    </Layout>
  )
}
