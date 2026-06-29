import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { getGroupDetail } from '../api/groups'
import { getStandings } from '../api/tournament'
import { getTeams } from '../api/teams'
import { getMatches } from '../api/matches'
import Layout from '../components/Layout'
import Bracket from '../components/Bracket'
import MatchesTab from '../components/tabs/MatchesTab'
import PicksTab from '../components/tabs/PicksTab'
import LeaderboardTab from '../components/tabs/LeaderboardTab'
import MembersTab from '../components/tabs/MembersTab'
import RulesTab from '../components/tabs/RulesTab'
import Icon, { type IconName } from '../components/Icon'
import { useCompetitionTheme } from '../hooks/useCompetitionTheme'
import type { GroupDetail, StandingGroup, TeamInfo, MatchListItem } from '../types'

type Tab = 'matches' | 'mypicks' | 'leaderboard' | 'members' | 'rules'
const FULL_TABS: Tab[] = ['matches', 'mypicks', 'leaderboard', 'members', 'rules']
// The platform-wide global group has no members tab (everyone's a member). Picks only
// appears once the group is unlocked for the knockout phase (i.e. predictions are possible).
const GLOBAL_TABS: Tab[] = ['matches', 'leaderboard', 'rules']
const GLOBAL_TABS_UNLOCKED: Tab[] = ['matches', 'mypicks', 'leaderboard', 'rules']
const TAB_META: Record<Tab, { icon: IconName; label: string }> = {
  matches: { icon: 'ball', label: 'Matches' },
  mypicks: { icon: 'target', label: 'Picks' },
  leaderboard: { icon: 'trophy', label: 'Board' },
  members: { icon: 'users', label: 'Members' },
  rules: { icon: 'sliders', label: 'Rules' },
}

export default function GroupDetailPage() {
  const { id, tab: tabParam } = useParams<{ id: string; tab: string }>()
  const navigate = useNavigate()
  const tab = tabParam as Tab
  const setTab = (t: Tab) => navigate(`/groups/${id}/${t}`)
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  // Knockout bracket data — fetched for the global group's Matches→Bracket sub-view.
  const [standings, setStandings] = useState<StandingGroup[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  // Real fixtures, so a resolved bracket card can deep-link into match details.
  const [bracketMatches, setBracketMatches] = useState<MatchListItem[]>([])
  // Global Matches tab sub-view: knockout bracket vs upcoming fixtures.
  const [matchView, setMatchView] = useState<'bracket' | 'upcoming'>('bracket')
  const tabsRef = useRef<Tab[]>(FULL_TABS)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // Inside a group, paint the competition (World Cup) theme; cleared on leave.
  useCompetitionTheme()

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
    const tabs = tabsRef.current
    const i = tabs.indexOf(tab)
    const next = dx < 0 ? i + 1 : i - 1
    if (next >= 0 && next < tabs.length) setTab(tabs[next])
  }

  useEffect(() => {
    if (!id) return
    getGroupDetail(id).then(setGroup).finally(() => setLoading(false))
  }, [id])

  // Pull standings + teams to render the same WC bracket as /tournament inside the
  // global group's Matches → Bracket sub-view.
  useEffect(() => {
    if (!group?.isGlobal || !id) return
    Promise.all([
      getStandings().catch(() => [] as StandingGroup[]),
      getTeams().catch(() => [] as TeamInfo[]),
      getMatches(id).then(r => r.matches).catch(() => [] as MatchListItem[]),
    ]).then(([s, t, m]) => { setStandings(s); setTeams(t); setBracketMatches(m) })
  }, [group?.isGlobal, id])

  if (!id) return null

  const isGlobal = !!group?.isGlobal
  const TABS = isGlobal ? (group?.isLocked ? GLOBAL_TABS : GLOBAL_TABS_UNLOCKED) : FULL_TABS
  tabsRef.current = TABS

  if (!tabParam || !TABS.includes(tab)) {
    return <Navigate to={`/groups/${id}/matches`} replace />
  }

  if (loading) {
    return (
      <Layout showBack>
        <div className="loading-state"><span className="loading-ball"><Icon name="ball" size={34} /></span></div>
      </Layout>
    )
  }

  if (!group) {
    return (
      <Layout showBack>
        <div className="empty-state">
          <Icon name="search" size={40} className="empty-icon-svg" />
          <p className="empty-title">Group not found</p>
        </div>
      </Layout>
    )
  }

  const tabIndex = TABS.indexOf(tab)
  const globalLocked = group.isGlobal && group.isLocked

  return (
    <Layout title={group.name} showBack>
      <div className={`group-hub ${group.isGlobal ? 'group-hub--global' : ''}`}>
        <div className="hub-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`hub-tab ${tab === t ? 'hub-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              <Icon name={TAB_META[t].icon} size={18} className="hub-tab-icon" />
              <span className="hub-tab-label">{TAB_META[t].label}</span>
            </button>
          ))}
          <div className="hub-tab-indicator" style={{ left: `calc(${tabIndex} * ${100 / TABS.length}%)`, width: `${100 / TABS.length}%` }} />
        </div>

        {globalLocked && (
          <div className="global-lock-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>The global board unlocks at the <strong>knockout phase</strong> — everyone starts level at <strong>0</strong>. Browse the bracket and standings until then.</span>
          </div>
        )}

        <div className="hub-content" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {tab === 'matches' && (
            isGlobal ? (
              <>
                <div className="match-subswitch">
                  <button className={`match-subswitch-btn ${matchView === 'bracket' ? 'on' : ''}`} onClick={() => setMatchView('bracket')}>Bracket</button>
                  <button className={`match-subswitch-btn ${matchView === 'upcoming' ? 'on' : ''}`} onClick={() => setMatchView('upcoming')}>Upcoming</button>
                </div>
                {matchView === 'bracket'
                  ? <Bracket
                      standings={standings}
                      teams={teams}
                      matches={bracketMatches}
                      onMatchClick={(matchId) => navigate(`/groups/${id}/match/${matchId}`)}
                    />
                  : <MatchesTab
                      groupId={id}
                      onMatchClick={(matchId, openDetail) => navigate(`/groups/${id}/match/${matchId}${openDetail ? '/live' : ''}`)}
                    />}
              </>
            ) : (
              <MatchesTab
                groupId={id}
                onMatchClick={(matchId, openDetail) => navigate(`/groups/${id}/match/${matchId}${openDetail ? '/live' : ''}`)}
              />
            )
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
