import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard } from '../../api/matches'
import { useAuthStore } from '../../store/authStore'
import Icon from '../Icon'
import type { LeaderboardEntry } from '../../types'

const MEDAL_CLASS = ['lb-medal--gold', 'lb-medal--silver', 'lb-medal--bronze']

export default function LeaderboardTab({ groupId }: { groupId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    getLeaderboard(groupId).then(setEntries).finally(() => setLoading(false))
  }, [groupId])

  if (loading) return <div className="loading-state"><span className="loading-ball"><Icon name="ball" size={34} /></span></div>

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="trophy" size={40} className="empty-icon-svg" />
        <p className="empty-title">No scores yet</p>
        <p className="empty-sub">Leaderboard updates after matches finish</p>
      </div>
    )
  }

  return (
    <div className="leaderboard-tab">
      <div className="lb-list">
        {entries.map((e, i) => {
          const isMe = e.userId === user?.id
          return (
            <button
              key={e.userId}
              className={`lb-row ${isMe ? 'lb-row--me' : ''}`}
              style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}
              onClick={() => navigate(`/groups/${groupId}/player/${e.userId}`, {
                state: { name: `${e.firstName} ${e.lastName}`, isMe },
              })}
            >
              <div className="lb-pos">
                {i < 3
                  ? <span className={`lb-medal ${MEDAL_CLASS[i]}`}><Icon name="medal" size={22} /></span>
                  : <span className="lb-pos-num">{e.position}</span>}
              </div>
              <div className="lb-info">
                <div className="lb-name">
                  {e.firstName} {e.lastName}
                  {isMe && <span className="you-badge">you</span>}
                </div>
              </div>
              <div className="lb-pts">{e.totalPoints}<span className="lb-pts-label">pts</span></div>
              <Icon name="chevron-right" size={18} className="lb-chevron" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
