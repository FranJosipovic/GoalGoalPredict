import { useEffect, useState, useCallback } from 'react'
import { getMatches } from '../../api/matches'
import type { MatchListItem } from '../../types'

interface Props {
  groupId: string
  onMatchClick: (matchId: number, isLive: boolean) => void
}

const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

function formatKickoff(utc: string) {
  const d = new Date(utc)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatKickoffDate(utc: string) {
  return new Date(utc).toLocaleDateString([], { day: '2-digit', month: 'short' })
}

function formatDate(utc: string) {
  return new Date(utc).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

function isToday(utc: string) {
  const d = new Date(utc)
  const n = new Date()
  return d.toDateString() === n.toDateString()
}

function MatchCard({ match, onClick }: { match: MatchListItem; onClick: () => void }) {
  const isLive = LIVE_STATUSES.includes(match.status)
  const isFinished = FINISHED_STATUSES.includes(match.status)
  const hasPred = match.myPrediction !== null

  return (
    <div className={`match-card ${isLive ? 'match-card--live' : ''}`} onClick={onClick}>
      {isLive && <div className="live-pulse" />}

      <div className="match-card-teams">
        <div className="match-team">
          <img src={match.homeTeam.logoUrl} alt={match.homeTeam.code} className="team-logo" />
          <span className="team-code">{match.homeTeam.code}</span>
        </div>

        <div className="match-score-center">
          {isLive ? (
            <div className="score-live">
              <span className="score-num">{match.homeGoals ?? 0}</span>
              <span className="score-sep">:</span>
              <span className="score-num">{match.awayGoals ?? 0}</span>
              <div className="elapsed-badge">{match.elapsedMinutes}'</div>
            </div>
          ) : isFinished ? (
            <div className="score-final">
              <span>{match.homeGoals}</span>
              <span className="score-sep">:</span>
              <span>{match.awayGoals}</span>
            </div>
          ) : (
            <div className="match-kickoff">
              <span className="kickoff-time">{formatKickoff(match.kickoffUtc)}</span>
              <span className="kickoff-label">{formatKickoffDate(match.kickoffUtc)}</span>
            </div>
          )}
        </div>

        <div className="match-team match-team--away">
          <span className="team-code">{match.awayTeam.code}</span>
          <img src={match.awayTeam.logoUrl} alt={match.awayTeam.code} className="team-logo" />
        </div>
      </div>

      <div className="match-card-meta">
        <span className="match-round">{match.round}</span>
        {hasPred ? (
          <span className="pred-badge pred-badge--set">
            {match.myPrediction!.homeGoals}:{match.myPrediction!.awayGoals}
            {isFinished && match.myPrediction!.totalPoints !== null && (
              <span className="pred-pts">+{match.myPrediction!.totalPoints}pt</span>
            )}
          </span>
        ) : (
          !isFinished && !isLive && (
            <span className="pred-badge pred-badge--empty">No prediction</span>
          )
        )}
        {isLive && <span className="live-badge">LIVE</span>}
        {isFinished && <span className="ft-badge">FT</span>}
      </div>
    </div>
  )
}

export default function MatchesTab({ groupId, onMatchClick }: Props) {
  const [matches, setMatches] = useState<MatchListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'finished' | 'all'>(() => {
    return (sessionStorage.getItem(`matches_filter_${groupId}`) as 'today' | 'upcoming' | 'finished' | 'all') ?? 'upcoming'
  })

  const load = useCallback(async () => {
    try {
      const data = await getMatches(groupId)
      setMatches(data)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30s for live matches
  useEffect(() => {
    const hasLive = matches.some(m => LIVE_STATUSES.includes(m.status))
    if (!hasLive) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [matches, load])

  const filtered = matches.filter(m => {
    if (filter === 'today') return isToday(m.kickoffUtc) || LIVE_STATUSES.includes(m.status)
    if (filter === 'upcoming') return m.status === 'NS'
    if (filter === 'finished') return FINISHED_STATUSES.includes(m.status)
    return true
  })

  // Finished matches read best most-recent-first
  if (filter === 'finished') filtered.reverse()

  // Group by date
  const grouped = filtered.reduce<Record<string, MatchListItem[]>>((acc, m) => {
    const key = formatDate(m.kickoffUtc)
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const liveMatches = matches.filter(m => LIVE_STATUSES.includes(m.status))

  if (loading) {
    return <div className="loading-state"><span className="loading-ball">⚽</span></div>
  }

  return (
    <div className="matches-tab">
      {/* Live banner */}
      {liveMatches.length > 0 && (
        <div className="live-banner">
          <div className="live-banner-dot" />
          <span>{liveMatches.length} match{liveMatches.length > 1 ? 'es' : ''} live now</span>
        </div>
      )}

      {/* Filter pills */}
      <div className="match-filters">
        {(['today', 'upcoming', 'finished', 'all'] as const).map(f => (
          <button
            key={f}
            className={`filter-pill ${filter === f ? 'filter-pill--active' : ''}`}
            onClick={() => {
              setFilter(f)
              sessionStorage.setItem(`matches_filter_${groupId}`, f)
            }}
          >
            {f === 'today' ? 'Today' : f === 'upcoming' ? 'Upcoming' : f === 'finished' ? 'Finished' : 'All'}
          </button>
        ))}
      </div>

      {/* Match groups */}
      {Object.entries(grouped).length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <p className="empty-title">No matches</p>
          <p className="empty-sub">Try "All" to see the full schedule</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayMatches]) => (
          <div key={date} className="match-day-group">
            <div className="match-day-label">
              {isToday(dayMatches[0].kickoffUtc) ? 'Today' : date}
            </div>
            {dayMatches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                onClick={() => onMatchClick(m.id, LIVE_STATUSES.includes(m.status))}
              />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
