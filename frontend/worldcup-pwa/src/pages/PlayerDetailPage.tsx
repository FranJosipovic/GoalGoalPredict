import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { getUserPredictions } from '../api/matches'
import type { MyPredictionItem } from '../types'

const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

const POS_COLOR: Record<string, string> = {
  Goalkeeper: '#64b5f6', Defender: '#4db6ac', Midfielder: '#ffd54f', Attacker: '#ef5350',
}

function formatKickoff(utc: string) {
  return new Date(utc).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Reconstruct the scoring breakdown from predicted vs actual score (no extra API call):
// exact = 7, correct outcome = 2, the remainder of the total is goalscorer points.
function breakdown(p: MyPredictionItem) {
  const hasResult = p.actualHome !== null && p.actualAway !== null
  if (!hasResult) return null
  const exact = p.predHome === p.actualHome && p.predAway === p.actualAway
  const predSign = Math.sign(p.predHome - p.predAway)
  const realSign = Math.sign((p.actualHome ?? 0) - (p.actualAway ?? 0))
  const outcome = !exact && predSign === realSign
  const total = p.isScored ? (p.points ?? 0) : p.projectedPoints
  const base = exact ? 7 : outcome ? 2 : 0
  return { exact, outcome, base, scorer: Math.max(0, total - base), total }
}

export default function PlayerDetailPage() {
  const { groupId, userId } = useParams<{ groupId: string; userId: string }>()
  const location = useLocation()
  const navState = (location.state ?? {}) as { name?: string; isMe?: boolean }
  const [items, setItems] = useState<MyPredictionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId || !userId) return
    getUserPredictions(userId, groupId)
      .then(setItems)
      .finally(() => setLoading(false))
  }, [groupId, userId])

  const name = navState.name ?? 'Player'
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('')

  const scored = items.filter(i => i.isScored)
  const totalPoints = scored.reduce((sum, i) => sum + (i.points ?? 0), 0)
  const exactCount = scored.filter(i => i.predHome === i.actualHome && i.predAway === i.actualAway).length
  const scorerPoints = scored.reduce((sum, i) => sum + (breakdown(i)?.scorer ?? 0), 0)

  return (
    <Layout title={navState.isMe ? 'My history' : name} showBack>
      <div className="player-detail">
        <div className="player-hero">
          <div className="player-avatar">{initials}</div>
          <div className="player-hero-info">
            <h1 className="player-hero-name">{name}{navState.isMe && <span className="you-badge">you</span>}</h1>
            <div className="player-hero-stats">
              <span><strong>{totalPoints}</strong> pts</span>
              <span><strong>{exactCount}</strong> exact</span>
              <span><strong>{scorerPoints}</strong> scorer</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><span className="loading-ball">⚽</span></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p className="empty-title">No visible picks</p>
            <p className="empty-sub">Their picks appear once matches kick off</p>
          </div>
        ) : (
          <div className="player-matches">
            {items.map(p => {
              const b = breakdown(p)
              const hasResult = p.actualHome !== null && p.actualAway !== null
              const isLive = LIVE_STATUSES.includes(p.status)
              const isFinished = FINISHED_STATUSES.includes(p.status)
              return (
                <div key={p.matchId} className={`pd-card ${b?.exact ? 'pd-card--exact' : ''}`}>
                  <div className="pd-card-head">
                    <span className="pd-round">{p.round}</span>
                    <span className="pd-when">{formatKickoff(p.kickoffUtc)}</span>
                    {isLive && <span className="mypred-flag mypred-flag--live"><span className="live-dot" />LIVE</span>}
                    {isFinished && <span className="mypred-flag mypred-flag--ft">FT</span>}
                  </div>

                  <div className="pd-fixture">
                    <div className="pd-team">
                      <img src={p.homeTeam.logoUrl} className="pd-logo" alt="" />
                      <span>{p.homeTeam.code}</span>
                    </div>
                    <div className="pd-scores">
                      <span className="pd-pick">{p.predHome}–{p.predAway}</span>
                      {hasResult && <span className="pd-real">({p.actualHome}–{p.actualAway})</span>}
                    </div>
                    <div className="pd-team pd-team--right">
                      <span>{p.awayTeam.code}</span>
                      <img src={p.awayTeam.logoUrl} className="pd-logo" alt="" />
                    </div>
                  </div>

                  {p.scorers.length > 0 && (
                    <div className="pd-scorers">
                      {p.scorers.map((s, i) => {
                        const hit = s.pointsAwarded > 0
                        return (
                          <span key={i} className={`pd-scorer ${hit ? 'pd-scorer--hit' : ''}`}
                            style={{ borderColor: hit ? 'var(--accent)' : (POS_COLOR[s.position] ?? '#666') }}>
                            {s.name.split(' ').pop()}{hit && <strong> +{s.pointsAwarded}</strong>}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {b ? (
                    <div className="pd-breakdown">
                      {b.exact && <span className="pd-chip pd-chip--exact">Exact +7</span>}
                      {b.outcome && <span className="pd-chip">Outcome +2</span>}
                      {!b.exact && !b.outcome && b.base === 0 && <span className="pd-chip pd-chip--miss">Score missed</span>}
                      {b.scorer > 0 && <span className="pd-chip pd-chip--scorer">Scorers +{b.scorer}</span>}
                      <span className={`pd-total ${p.isScored ? '' : 'pd-total--live'}`}>
                        {b.total} pts {!p.isScored && <em>live</em>}
                      </span>
                    </div>
                  ) : (
                    <div className="pd-breakdown"><span className="pd-chip pd-chip--pending">Not started</span></div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
