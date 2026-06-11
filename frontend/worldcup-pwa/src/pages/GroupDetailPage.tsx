import { useState, useEffect, useRef } from 'react'
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
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    // Horizontal swipe only: ignore mostly-vertical gestures (scrolling).
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const i = TABS.indexOf(tab)
    const next = dx < 0 ? i + 1 : i - 1
    if (next >= 0 && next < TABS.length) setTab(TABS[next])
  }

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

        <div className="hub-content" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {tab === 'matches' && (
            <MatchesTab
              groupId={id}
              onMatchClick={(matchId, openDetail) => navigate(`/groups/${id}/match/${matchId}${openDetail ? '/live' : ''}`)}
            />
          )}
          {tab === 'mypicks' && (
            <PicksTab
              groupId={id}
              onMatchClick={(matchId, openDetail) => navigate(`/groups/${id}/match/${matchId}${openDetail ? '/live' : ''}`)}
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
