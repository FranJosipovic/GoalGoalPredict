import { useEffect, useState, useCallback } from 'react'
import { getMyPredictions, getMatchPredictions } from '../../api/matches'
import { useAuthStore } from '../../store/authStore'
import type { MyPredictionItem, GroupPredictions, ScorerPick } from '../../types'

interface Props {
  groupId: string
  onMatchClick: (matchId: number, isLive: boolean) => void
}

const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

type Bucket = 'live' | 'upcoming' | 'finished'

function bucketOf(status: string): Bucket {
  if (LIVE_STATUSES.includes(status)) return 'live'
  if (FINISHED_STATUSES.includes(status)) return 'finished'
  return 'upcoming'
}

function formatKickoff(utc: string) {
  return new Date(utc).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const POS_COLOR: Record<string, string> = {
  Goalkeeper: '#64b5f6', Defender: '#4db6ac', Midfielder: '#ffd54f', Attacker: '#ef5350',
}

function ScorerChips({ scorers }: { scorers: ScorerPick[] }) {
  if (scorers.length === 0) return null
  return (
    <div className="mypred-scorers">
      {scorers.map((s, i) => {
        const hit = s.pointsAwarded > 0
        return (
          <span
            key={i}
            className={`mypred-scorer ${hit ? 'mypred-scorer--hit' : ''}`}
            style={{ borderColor: hit ? 'var(--accent)' : (POS_COLOR[s.position] ?? '#666') }}
          >
            <span className="mypred-scorer-dot" style={{ background: hit ? 'var(--accent)' : (POS_COLOR[s.position] ?? '#666') }} />
            {s.name.split(' ').pop()}
            {hit && <span className="mypred-scorer-pts">+{s.pointsAwarded}</span>}
          </span>
        )
      })}
    </div>
  )
}

function GroupPicksPanel({ matchId, groupId, meId }: { matchId: number; groupId: string; meId?: string }) {
  const [data, setData] = useState<GroupPredictions | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'hidden'>('loading')

  useEffect(() => {
    let alive = true
    getMatchPredictions(matchId, groupId)
      .then(d => { if (alive) { setData(d); setState('ready') } })
      .catch(() => { if (alive) setState('hidden') })
    return () => { alive = false }
  }, [matchId, groupId])

  if (state === 'loading') return <div className="picks-panel picks-panel--loading">Loading picks…</div>
  if (state === 'hidden' || !data) return <div className="picks-panel picks-panel--hidden">🔒 Other picks reveal at kickoff</div>

  return (
    <div className="picks-panel">
      {data.predictions.map(p => {
        const isMe = p.userId === meId
        return (
          <div key={p.userId} className={`picks-row ${isMe ? 'picks-row--me' : ''}`}>
            <div className="picks-row-main">
              <span className="picks-avatar">{p.firstName[0]}{p.lastName[0]}</span>
              <span className="picks-name">{p.firstName} {isMe && <span className="you-badge">you</span>}</span>
              <span className="picks-pick">{p.predHome}–{p.predAway}</span>
            </div>
            {p.scorers.length > 0 && (
              <div className="picks-row-scorers">
                {p.scorers.map((s, i) => {
                  const hit = s.pointsAwarded > 0
                  return (
                    <span key={i} className={`picks-scorer ${hit ? 'picks-scorer--hit' : ''}`}
                      style={{ color: hit ? 'var(--accent)' : (POS_COLOR[s.position] ?? '#999') }}>
                      {s.name.split(' ').pop()}{hit && <strong> +{s.pointsAwarded}</strong>}
                    </span>
                  )
                })}
              </div>
            )}
            <span className="picks-pts">{p.projectedPoints}<small>pts</small></span>
          </div>
        )
      })}
    </div>
  )
}

function PredictionCard({ p, groupId, meId, onClick }: { p: MyPredictionItem; groupId: string; meId?: string; onClick: () => void }) {
  const bucket = bucketOf(p.status)
  const [expanded, setExpanded] = useState(false)
  const hasResult = p.actualHome !== null && p.actualAway !== null
  const exact = hasResult && p.predHome === p.actualHome && p.predAway === p.actualAway
  const points = p.isScored ? p.points : (hasResult ? p.projectedPoints : null)
  const canReveal = bucket !== 'upcoming'

  return (
    <div className={`mypred-card mypred-card--${bucket}`}>
      <button className="mypred-card-body" onClick={onClick}>
        <div className="mypred-top">
          <span className="mypred-round">{p.round}</span>
          <span className="mypred-when">{formatKickoff(p.kickoffUtc)}</span>
          {bucket === 'live' && <span className="mypred-flag mypred-flag--live"><span className="live-dot" />LIVE</span>}
          {bucket === 'finished' && <span className="mypred-flag mypred-flag--ft">FT</span>}
        </div>

        <div className="mypred-fixture">
          <div className="mypred-side">
            <img src={p.homeTeam.logoUrl} className="mypred-logo" alt="" />
            <span className="mypred-code">{p.homeTeam.code}</span>
          </div>
          <div className="mypred-scores">
            <div className="mypred-scoreline">
              <span className="mypred-score-tag">PICK</span>
              <span className={`mypred-score ${exact ? 'mypred-score--exact' : ''}`}>{p.predHome}–{p.predAway}</span>
            </div>
            {hasResult && (
              <div className="mypred-scoreline mypred-scoreline--actual">
                <span className="mypred-score-tag">REAL</span>
                <span className="mypred-score">{p.actualHome}–{p.actualAway}</span>
              </div>
            )}
          </div>
          <div className="mypred-side mypred-side--right">
            <span className="mypred-code">{p.awayTeam.code}</span>
            <img src={p.awayTeam.logoUrl} className="mypred-logo" alt="" />
          </div>
        </div>

        <ScorerChips scorers={p.scorers} />

        <div className="mypred-foot">
          {exact && <span className="mypred-badge mypred-badge--exact">✓ Exact score</span>}
          {points !== null ? (
            <span className={`mypred-points ${p.isScored ? '' : 'mypred-points--proj'}`}>
              <strong>{points >= 0 ? '+' : ''}{points}</strong> pts {!p.isScored && <em>live</em>}
            </span>
          ) : (
            <span className="mypred-points mypred-points--pending">Awaiting kickoff</span>
          )}
        </div>
      </button>

      <button
        className={`picks-reveal-btn ${expanded ? 'picks-reveal-btn--open' : ''}`}
        onClick={() => canReveal && setExpanded(v => !v)}
        disabled={!canReveal}
      >
        {canReveal ? (expanded ? '▲ Hide group picks' : '▼ Show group picks') : '🔒 Group picks reveal at kickoff'}
      </button>

      {expanded && canReveal && <GroupPicksPanel matchId={p.matchId} groupId={groupId} meId={meId} />}
    </div>
  )
}

export default function PicksTab({ groupId, onMatchClick }: Props) {
  const { user } = useAuthStore()
  const [items, setItems] = useState<MyPredictionItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setItems(await getMyPredictions(groupId))
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!items.some(i => LIVE_STATUSES.includes(i.status))) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [items, load])

  if (loading) return <div className="loading-state"><span className="loading-ball">⚽</span></div>

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🎯</span>
        <p className="empty-title">No picks yet</p>
        <p className="empty-sub">Head to Matches and place your first pick</p>
      </div>
    )
  }

  const scored = items.filter(i => i.isScored)
  const totalPoints = scored.reduce((sum, i) => sum + (i.points ?? 0), 0)
  const exactCount = scored.filter(i => i.predHome === i.actualHome && i.predAway === i.actualAway).length

  const order: Bucket[] = ['live', 'upcoming', 'finished']
  const labels: Record<Bucket, string> = { live: 'Live now', upcoming: 'Upcoming', finished: 'Finished' }
  const grouped = order
    .map(b => ({ bucket: b, list: items.filter(i => bucketOf(i.status) === b) }))
    .filter(g => g.list.length > 0)

  return (
    <div className="mypred-tab">
      <div className="mypred-summary">
        <div className="mypred-stat">
          <span className="mypred-stat-num">{totalPoints}</span>
          <span className="mypred-stat-label">Points</span>
        </div>
        <div className="mypred-stat">
          <span className="mypred-stat-num">{items.length}</span>
          <span className="mypred-stat-label">Picks</span>
        </div>
        <div className="mypred-stat">
          <span className="mypred-stat-num">{exactCount}</span>
          <span className="mypred-stat-label">Exact</span>
        </div>
      </div>

      {grouped.map(({ bucket, list }) => (
        <div key={bucket} className="mypred-group">
          <div className="mypred-group-label">{labels[bucket]} <span className="mypred-group-count">{list.length}</span></div>
          {list.map(p => (
            <PredictionCard
              key={p.matchId}
              p={p}
              groupId={groupId}
              meId={user?.id}
              onClick={() => onMatchClick(p.matchId, LIVE_STATUSES.includes(p.status))}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
