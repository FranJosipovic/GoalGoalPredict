import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGroupDetail } from '../api/groups'
import Layout from '../components/Layout'
import MatchesTab from '../components/tabs/MatchesTab'
import PicksTab from '../components/tabs/PicksTab'
import LeaderboardTab from '../components/tabs/LeaderboardTab'
import MembersTab from '../components/tabs/MembersTab'
import NotificationToggle from '../components/NotificationToggle'
import type { GroupDetail } from '../types'

type Tab = 'matches' | 'mypicks' | 'leaderboard' | 'members'
const TABS: Tab[] = ['matches', 'mypicks', 'leaderboard', 'members']

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('matches')
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getGroupDetail(id).then(setGroup).finally(() => setLoading(false))
  }, [id])

  if (!id) return null

  if (loading) {
    return (
      <Layout showBack>
        <div className="loading-state"><span className="loading-ball">⚽</span></div>
      </Layout>
    )
  }

  if (!group) {
    return (
      <Layout showBack>
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p className="empty-title">Group not found</p>
        </div>
      </Layout>
    )
  }

  const tabIndex = TABS.indexOf(tab)

  return (
    <Layout title={group.name} showBack>
      <div className="group-hub">
        <div className="hub-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`hub-tab ${tab === t ? 'hub-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'matches' && '⚽ Matches'}
              {t === 'mypicks' && '🎯 Picks'}
              {t === 'leaderboard' && '🏆 Board'}
              {t === 'members' && '👥 Members'}
            </button>
          ))}
          <div className="hub-tab-indicator" style={{ left: `calc(${tabIndex} * 25%)`, width: '25%' }} />
        </div>

        <div className="hub-notif">
          <NotificationToggle />
        </div>

        <div className="hub-content">
          {tab === 'matches' && (
            <MatchesTab
              groupId={id}
              onMatchClick={(matchId) => navigate(`/groups/${id}/match/${matchId}`)}
            />
          )}
          {tab === 'mypicks' && (
            <PicksTab
              groupId={id}
              onMatchClick={(matchId) => navigate(`/groups/${id}/match/${matchId}`)}
            />
          )}
          {tab === 'leaderboard' && <LeaderboardTab groupId={id} />}
          {tab === 'members' && <MembersTab group={group} />}
        </div>
      </div>
    </Layout>
  )
}
