import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { getGroupDetail } from '../api/groups'
import Layout from '../components/Layout'
import MatchesTab from '../components/tabs/MatchesTab'
import PicksTab from '../components/tabs/PicksTab'
import LeaderboardTab from '../components/tabs/LeaderboardTab'
import MembersTab from '../components/tabs/MembersTab'
import RulesTab from '../components/tabs/RulesTab'
import NotificationToggle from '../components/NotificationToggle'
import type { GroupDetail } from '../types'

type Tab = 'matches' | 'mypicks' | 'leaderboard' | 'members' | 'rules'
const TABS: Tab[] = ['matches', 'mypicks', 'leaderboard', 'members', 'rules']

export default function GroupDetailPage() {
  const { id, tab: tabParam } = useParams<{ id: string; tab: string }>()
  const navigate = useNavigate()
  const tab = tabParam as Tab
  const setTab = (t: Tab) => navigate(`/groups/${id}/${t}`)
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getGroupDetail(id).then(setGroup).finally(() => setLoading(false))
  }, [id])

  if (!id) return null

  if (!tabParam || !TABS.includes(tab)) {
    return <Navigate to={`/groups/${id}/matches`} replace />
  }

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
              {t === 'rules' && '⚙️ Rules'}
            </button>
          ))}
          <div className="hub-tab-indicator" style={{ left: `calc(${tabIndex} * ${100 / TABS.length}%)`, width: `${100 / TABS.length}%` }} />
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
          {tab === 'rules' && <RulesTab groupId={id} />}
        </div>
      </div>
    </Layout>
  )
}
