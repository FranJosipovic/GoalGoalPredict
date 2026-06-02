import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import NotificationToggle from '../components/NotificationToggle'
import { getMatchDetail, getMyPrediction, upsertPrediction } from '../api/matches'
import { getTeamSquad } from '../api/teams'
import { useCountdown } from '../hooks/useCountdown'
import type { MatchDetail, Player } from '../types'

// Positions arrive as full names ("Goalkeeper"/"Attacker") or short codes ("G"/"F").
// Normalise the first letter; treat Attacker (A) and Forward (F) the same.
const POS_LETTER = (pos: string) => {
  const p = (pos[0] ?? 'M').toUpperCase()
  return p === 'A' ? 'F' : p
}
const POS_RANK = (pos: string) => ['G', 'D', 'M', 'F'].indexOf(POS_LETTER(pos))
const POS_POINTS = (pos: string) => {
  const p = POS_LETTER(pos)
  return p === 'G' || p === 'D' ? 4 : p === 'M' ? 2 : p === 'F' ? 1 : 0
}
const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']
const COUNTS_FOR_SCORER = ['Normal Goal', 'Penalty']

export default function MatchPredictPage() {
  const { groupId, matchId } = useParams<{ groupId: string; matchId: string }>()
  const navigate = useNavigate()

  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [homeGoals, setHomeGoals] = useState(0)
  const [awayGoals, setAwayGoals] = useState(0)
  const [scorers, setScorers] = useState<number[]>([]) // array with possible duplicates
  // Snapshot of the already-saved prediction, so Save only enables on a real change.
  const [saved, setSaved] = useState<{ home: number; away: number; scorers: number[] } | null>(null)

  const [search, setSearch] = useState('')
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home')

  const countdown = useCountdown(match?.kickoffUtc ?? '')
  const lineupCountdown = useCountdown(match?.lineupRevealUtc ?? '')
  const isLocked = match ? new Date(match.kickoffUtc) <= new Date() : false

  useEffect(() => {
    if (!matchId || !groupId) return
    Promise.all([
      getMatchDetail(Number(matchId)),
      getMyPrediction(Number(matchId), groupId),
    ]).then(async ([m, existing]) => {
      setMatch(m)
      if (existing) {
        setHomeGoals(existing.homeGoals)
        setAwayGoals(existing.awayGoals)
        setScorers(existing.goalscorerPlayerIds)
        setSaved({ home: existing.homeGoals, away: existing.awayGoals, scorers: existing.goalscorerPlayerIds })
      }
      const [homeSquad, awaySquad] = await Promise.all([
        getTeamSquad(m.homeTeam.id),
        getTeamSquad(m.awayTeam.id),
      ])
      setHomePlayers(homeSquad.players)
      setAwayPlayers(awaySquad.players)
    }).finally(() => setLoading(false))
  }, [matchId, groupId])

  // Refresh score / goals / points every 30s while the match is live
  useEffect(() => {
    if (!matchId || !match || !LIVE_STATUSES.includes(match.status)) return
    const t = setInterval(() => {
      getMatchDetail(Number(matchId)).then(setMatch).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [matchId, match])

  // Scorer constraints
  const homeScorers = scorers.filter(id => homePlayers.some(p => p.id === id))
  const awayScorers = scorers.filter(id => awayPlayers.some(p => p.id === id))
  const homeSlotsFull = homeScorers.length >= homeGoals
  const awaySlotsFull = awayScorers.length >= awayGoals

  const addScorer = useCallback((playerId: number, team: 'home' | 'away') => {
    const isFull = team === 'home' ? homeSlotsFull : awaySlotsFull
    if (isFull) return
    setScorers(prev => [...prev, playerId])
  }, [homeSlotsFull, awaySlotsFull])

  const removeLastOf = useCallback((playerId: number) => {
    setScorers(prev => {
      const idx = [...prev].reverse().findIndex(id => id === playerId)
      if (idx === -1) return prev
      const realIdx = prev.length - 1 - idx
      return prev.filter((_, i) => i !== realIdx)
    })
  }, [])

  const handleScoreChange = (side: 'home' | 'away', val: number) => {
    const v = Math.max(0, Math.min(20, val))
    if (side === 'home') {
      setHomeGoals(v)
      // Trim home scorers if reduced
      const homeIds = scorers.filter(id => homePlayers.some(p => p.id === id))
      if (homeIds.length > v) {
        const toRemove = homeIds.length - v
        let removed = 0
        setScorers(prev => prev.filter(id => {
          if (removed < toRemove && homePlayers.some(p => p.id === id)) { removed++; return false }
          return true
        }))
      }
    } else {
      setAwayGoals(v)
      const awayIds = scorers.filter(id => awayPlayers.some(p => p.id === id))
      if (awayIds.length > v) {
        const toRemove = awayIds.length - v
        let removed = 0
        setScorers(prev => prev.filter(id => {
          if (removed < toRemove && awayPlayers.some(p => p.id === id)) { removed++; return false }
          return true
        }))
      }
    }
  }

  const handleSave = async () => {
    if (!match || !groupId || isLocked) return
    setSaving(true)
    setError('')
    try {
      await upsertPrediction({
        matchId: match.id,
        groupId,
        homeGoals,
        awayGoals,
        goalscorerPlayerIds: scorers,
      })
      navigate(`/groups/${groupId}`)
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Failed to save prediction')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Layout showBack><div className="loading-state"><span className="loading-ball">⚽</span></div></Layout>
  if (!match) return <Layout showBack><div className="empty-state"><p>Match not found</p></div></Layout>

  const activePlayers = (activeTeam === 'home' ? homePlayers : awayPlayers)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const posOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']
  const sortedPlayers = [...activePlayers].sort((a, b) =>
    posOrder.indexOf(a.position) - posOrder.indexOf(b.position)
  )

  const scorerCountFor = (playerId: number) => scorers.filter(id => id === playerId).length

  const ptsBadge = (pos: string) => {
    const map: Record<string, string> = { Goalkeeper: '4pt', Defender: '4pt', Midfielder: '2pt', Attacker: '1pt' }
    return map[pos] ?? ''
  }

  const isLive = LIVE_STATUSES.includes(match.status)
  const isFinished = FINISHED_STATUSES.includes(match.status)
  const hasActual = match.homeGoals !== null && match.awayGoals !== null
  const allSquad = [...homePlayers, ...awayPlayers]

  // Goals ordered for the timeline (who & when scored)
  const timeline = [...match.goals].sort((a, b) =>
    a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0))

  // How my prediction is scoring (live projection / final). Mirrors the backend ScoringEngine.
  let myScore: null | {
    exactPts: number; outcomePts: number; scorerPts: number; total: number
    scorerLines: { name: string; pts: number }[]
  } = null
  if (isLocked && hasActual) {
    const ah = match.homeGoals!, aa = match.awayGoals!
    const exact = homeGoals === ah && awayGoals === aa
    const outcome = !exact && Math.sign(homeGoals - awayGoals) === Math.sign(ah - aa)
    const exactPts = exact ? 7 : 0
    const outcomePts = outcome ? 2 : 0

    const predCounts = scorers.reduce<Record<number, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1; return acc
    }, {})
    let scorerPts = 0
    const scorerLines: { name: string; pts: number }[] = []
    for (const [idStr, cnt] of Object.entries(predCounts)) {
      const id = Number(idStr)
      const actualCnt = match.goals.filter(g =>
        COUNTS_FOR_SCORER.includes(g.goalType) && g.scorerPlayerId === id).length
      const matched = Math.min(cnt, actualCnt)
      if (matched > 0) {
        const pl = allSquad.find(p => p.id === id)
        const pts = matched * POS_POINTS(pl?.position ?? '')
        scorerPts += pts
        scorerLines.push({ name: pl?.name ?? 'Player', pts })
      }
    }
    myScore = { exactPts, outcomePts, scorerPts, total: exactPts + outcomePts + scorerPts, scorerLines }
  }

  // Compact lineups block reused in both modes
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

  const predictedScorerNames = scorers
    .map(id => allSquad.find(p => p.id === id)?.name.split(' ').pop())
    .filter(Boolean) as string[]

  // Enable Save only when something actually changed vs the saved prediction.
  const sameScorers = (a: number[], b: number[]) =>
    a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',')
  const isDirty = !saved
    || saved.home !== homeGoals
    || saved.away !== awayGoals
    || !sameScorers(saved.scorers, scorers)

  return (
    <Layout title={isFinished ? 'Match' : isLive ? 'Live' : 'Prediction'} showBack>
      <div className="predict-page">
        {/* Status banner (item 3) */}
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
        {isFinished && (
          <div className="predict-status predict-status--ft">🏁 Match finished</div>
        )}

        {/* Match alerts */}
        <div className="predict-notif">
          <NotificationToggle />
        </div>

        {/* SCORE ON TOP — actual when locked, editable steppers when predicting */}
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

        {/* LINEUPS */}
        {lineupsBlock}

        {/* GOALS TIMELINE — who & when scored (locked only) */}
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
                    <span className="goal-type-icon">{g.goalType === 'Penalty' ? '(P)' : g.goalType === 'Own Goal' ? '(OG)' : '⚽'}</span>
                    <span className="goal-scorer">{g.scorerName ?? 'Unknown'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MY POINTS — projection while live, final once scored */}
        {isLocked && (
          <div className="ms-section ms-mypoints">
            <div className="ms-mypoints-head">
              <span className="section-label">YOUR PREDICTION</span>
              <span className="ms-mypoints-total">
                {myScore ? myScore.total : 0} pts{isLive && myScore ? <em> live</em> : ''}
              </span>
            </div>
            <div className="ms-pred-line">
              You picked <strong>{homeGoals}–{awayGoals}</strong>
              {predictedScorerNames.length > 0 && <> · {predictedScorerNames.join(', ')}</>}
            </div>
            {myScore && (
              <div className="ms-breakdown">
                <div className="ms-bd-row">
                  <span>Exact score</span>
                  <span className={myScore.exactPts ? 'ms-bd-win' : 'ms-bd-miss'}>{myScore.exactPts ? '+7' : '—'}</span>
                </div>
                {myScore.exactPts === 0 && (
                  <div className="ms-bd-row">
                    <span>Correct outcome</span>
                    <span className={myScore.outcomePts ? 'ms-bd-win' : 'ms-bd-miss'}>{myScore.outcomePts ? '+2' : '—'}</span>
                  </div>
                )}
                {myScore.scorerLines.length > 0
                  ? myScore.scorerLines.map((s, i) => (
                      <div key={i} className="ms-bd-row">
                        <span>⚽ {s.name}</span>
                        <span className="ms-bd-win">+{s.pts}</span>
                      </div>
                    ))
                  : (
                    <div className="ms-bd-row">
                      <span>Goalscorers</span>
                      <span className="ms-bd-miss">—</span>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* PREDICTION EDITOR — only before kickoff */}
        {!isLocked && (
          <>
            <div className="scorer-section">
              <div className="scorer-header">
                <span className="scorer-title">GOALSCORERS</span>
                <span className="scorer-sub">Pick who scores — max {homeGoals} from {match.homeTeam.code}, {awayGoals} from {match.awayTeam.code}</span>
              </div>
              <div className="scorer-slots">
                <div className="slots-group">
                  <span className="slots-label">{match.homeTeam.code}</span>
                  <div className="slots-row">
                    {Array.from({ length: homeGoals }).map((_, i) => {
                      const pid = homeScorers[i]
                      const p = pid ? homePlayers.find(pl => pl.id === pid) : null
                      return (
                        <div key={i} className={`slot ${p ? 'slot--filled' : ''}`} onClick={() => p && removeLastOf(p.id)}>
                          {p ? <span className="slot-name">{p.name.split(' ').pop()}</span> : <span className="slot-empty">+</span>}
                        </div>
                      )
                    })}
                    {homeGoals === 0 && <span className="slots-empty-hint">Set home goals first</span>}
                  </div>
                </div>
                <div className="slots-group">
                  <span className="slots-label">{match.awayTeam.code}</span>
                  <div className="slots-row">
                    {Array.from({ length: awayGoals }).map((_, i) => {
                      const pid = awayScorers[i]
                      const p = pid ? awayPlayers.find(pl => pl.id === pid) : null
                      return (
                        <div key={i} className={`slot ${p ? 'slot--filled' : ''}`} onClick={() => p && removeLastOf(p.id)}>
                          {p ? <span className="slot-name">{p.name.split(' ').pop()}</span> : <span className="slot-empty">+</span>}
                        </div>
                      )
                    })}
                    {awayGoals === 0 && <span className="slots-empty-hint">Set away goals first</span>}
                  </div>
                </div>
              </div>
            </div>

            {(homeGoals > 0 || awayGoals > 0) && (
              <div className="player-picker">
                <div className="picker-team-switch">
                  <button className={`picker-team-btn ${activeTeam === 'home' ? 'active' : ''}`} onClick={() => setActiveTeam('home')} disabled={homeSlotsFull && activeTeam !== 'home'}>
                    {match.homeTeam.code} ({homeScorers.length}/{homeGoals})
                  </button>
                  <button className={`picker-team-btn ${activeTeam === 'away' ? 'active' : ''}`} onClick={() => setActiveTeam('away')} disabled={awaySlotsFull && activeTeam !== 'away'}>
                    {match.awayTeam.code} ({awayScorers.length}/{awayGoals})
                  </button>
                </div>
                <input className="field-input picker-search" placeholder="Search player..." value={search} onChange={e => setSearch(e.target.value)} />
                <div className="player-list">
                  {sortedPlayers.map(p => {
                    const count = scorerCountFor(p.id)
                    const full = activeTeam === 'home' ? homeSlotsFull : awaySlotsFull
                    return (
                      <button key={p.id} className={`player-row ${count > 0 ? 'player-row--picked' : ''}`} onClick={() => addScorer(p.id, activeTeam)} disabled={full}>
                        <span className="player-num">#{p.shirtNumber}</span>
                        <span className="player-name">{p.name}</span>
                        <span className="player-pos-badge">{p.position.slice(0,3).toUpperCase()}</span>
                        <span className="player-pts">{ptsBadge(p.position)}</span>
                        {count > 0 && <span className="player-count">×{count}</span>}
                      </button>
                    )
                  })}
                </div>
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
