import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard } from '../../api/matches'
import { useAuthStore } from '../../store/authStore'
import type { LeaderboardEntry } from '../../types'

export default function LeaderboardTab({ groupId }: { groupId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    getLeaderboard(groupId).then(setEntries).finally(() => setLoading(false))
  }, [groupId])

  if (loading) return <div className="loading-state"><span className="loading-ball">⚽</span></div>

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🏆</span>
        <p className="empty-title">No scores yet</p>
        <p className="empty-sub">Leaderboard updates after matches finish</p>
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="leaderboard-tab">
      <div className="lb-list">
        {entries.map((e, i) => {
          const isMe = e.userId === user?.id
          return (
            <button
              key={e.userId}
              className={`lb-row ${isMe ? 'lb-row--me' : ''}`}
              onClick={() => navigate(`/groups/${groupId}/player/${e.userId}`, {
                state: { name: `${e.firstName} ${e.lastName}`, isMe },
              })}
            >
              <div className="lb-pos">
                {i < 3 ? medals[i] : <span className="lb-pos-num">{e.position}</span>}
              </div>
              <div className="lb-info">
                <div className="lb-name">
                  {e.firstName} {e.lastName}
                  {isMe && <span className="you-badge">you</span>}
                </div>
                <div className="lb-breakdown">
                  <span title="Exact scores">⚡{e.exactScores}×7</span>
                  <span title="Correct outcomes">✓{e.correctOutcomes}×2</span>
                  <span title="Goalscorer points">⚽{e.goalscorerPoints}pts</span>
                </div>
              </div>
              <div className="lb-pts">{e.totalPoints}<span className="lb-pts-label">pts</span></div>
              <span className="lb-chevron">›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
