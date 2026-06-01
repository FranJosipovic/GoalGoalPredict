import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getMatchDetail, getMyPrediction, upsertPrediction } from '../api/matches'
import { getTeamSquad } from '../api/teams'
import { useCountdown } from '../hooks/useCountdown'
import type { MatchDetail, Player } from '../types'

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

  const [search, setSearch] = useState('')
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home')

  const countdown = useCountdown(match?.kickoffUtc ?? '')
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
      }
      const [homeSquad, awaySquad] = await Promise.all([
        getTeamSquad(m.homeTeam.id),
        getTeamSquad(m.awayTeam.id),
      ])
      setHomePlayers(homeSquad.players)
      setAwayPlayers(awaySquad.players)
    }).finally(() => setLoading(false))
  }, [matchId, groupId])

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

  return (
    <Layout title="Prediction" showBack>
      <div className="predict-page">
        {/* Countdown */}
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

        {isLocked && (
          <div className="predict-locked">🔒 Predictions locked — match has started</div>
        )}

        {/* Score picker */}
        <div className="score-picker-v2">
          <div className="score-team-label">
            <img src={match.homeTeam.logoUrl} className="stepper-logo" alt="" />
            <span className="stepper-team">{match.homeTeam.name}</span>
          </div>

          <div className="score-stepper-inline">
            <button
              className="stepper-btn stepper-btn--plus"
              onClick={() => !isLocked && handleScoreChange('home', homeGoals + 1)}
              disabled={isLocked}
            >+</button>
            <span className="stepper-val">{homeGoals}</span>
            <button
              className="stepper-btn stepper-btn--minus"
              onClick={() => !isLocked && handleScoreChange('home', homeGoals - 1)}
              disabled={isLocked || homeGoals === 0}
            >−</button>
          </div>

          <div className="score-colon">:</div>

          <div className="score-stepper-inline">
            <button
              className="stepper-btn stepper-btn--plus"
              onClick={() => !isLocked && handleScoreChange('away', awayGoals + 1)}
              disabled={isLocked}
            >+</button>
            <span className="stepper-val">{awayGoals}</span>
            <button
              className="stepper-btn stepper-btn--minus"
              onClick={() => !isLocked && handleScoreChange('away', awayGoals - 1)}
              disabled={isLocked || awayGoals === 0}
            >−</button>
          </div>

          <div className="score-team-label score-team-label--right">
            <img src={match.awayTeam.logoUrl} className="stepper-logo" alt="" />
            <span className="stepper-team">{match.awayTeam.name}</span>
          </div>
        </div>

        {/* Scorer slots */}
        <div className="scorer-section">
          <div className="scorer-header">
            <span className="scorer-title">GOALSCORERS</span>
            <span className="scorer-sub">Pick who scores — max {homeGoals} from {match.homeTeam.code}, {awayGoals} from {match.awayTeam.code}</span>
          </div>

          {/* Slot indicators */}
          <div className="scorer-slots">
            <div className="slots-group">
              <span className="slots-label">{match.homeTeam.code}</span>
              <div className="slots-row">
                {Array.from({ length: homeGoals }).map((_, i) => {
                  const pid = homeScorers[i]
                  const p = pid ? homePlayers.find(pl => pl.id === pid) : null
                  return (
                    <div key={i} className={`slot ${p ? 'slot--filled' : ''}`}
                      onClick={() => p && removeLastOf(p.id)}>
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
                    <div key={i} className={`slot ${p ? 'slot--filled' : ''}`}
                      onClick={() => p && removeLastOf(p.id)}>
                      {p ? <span className="slot-name">{p.name.split(' ').pop()}</span> : <span className="slot-empty">+</span>}
                    </div>
                  )
                })}
                {awayGoals === 0 && <span className="slots-empty-hint">Set away goals first</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Player picker */}
        {!isLocked && (homeGoals > 0 || awayGoals > 0) && (
          <div className="player-picker">
            <div className="picker-team-switch">
              <button
                className={`picker-team-btn ${activeTeam === 'home' ? 'active' : ''}`}
                onClick={() => setActiveTeam('home')}
                disabled={homeSlotsFull && activeTeam !== 'home'}
              >
                {match.homeTeam.code} ({homeScorers.length}/{homeGoals})
              </button>
              <button
                className={`picker-team-btn ${activeTeam === 'away' ? 'active' : ''}`}
                onClick={() => setActiveTeam('away')}
                disabled={awaySlotsFull && activeTeam !== 'away'}
              >
                {match.awayTeam.code} ({awayScorers.length}/{awayGoals})
              </button>
            </div>

            <input
              className="field-input picker-search"
              placeholder="Search player..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="player-list">
              {sortedPlayers.map(p => {
                const count = scorerCountFor(p.id)
                const isActive = activeTeam === 'home'
                const full = isActive ? homeSlotsFull : awaySlotsFull
                return (
                  <button
                    key={p.id}
                    className={`player-row ${count > 0 ? 'player-row--picked' : ''}`}
                    onClick={() => addScorer(p.id, activeTeam)}
                    disabled={full}
                  >
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

        {!isLocked && (
          <div className="predict-save">
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
              {saving ? <span className="spinner" /> : 'Save Prediction'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
