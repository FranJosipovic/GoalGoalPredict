import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { getSystemStatus } from '../../api/admin'

interface LiveMatch {
  id: number; status: string; source: string; elapsedMinutes: number | null
  homeGoals: number | null; awayGoals: number | null; lastSyncedAt: string
  home: string; away: string
}
interface Upcoming { id: number; kickoffUtc: string; source: string; lineupsAvailable: boolean; home: string; away: string }
interface SystemStatus {
  entities: {
    users: number; admins: number; groups: number; realGroups: number; simGroups: number
    predictions: number; pushSubs: number; teams: number; players: number; matches: number; teamsWithoutPlayers: number
  }
  sync: { lastFixtureSync: string | null; lastTeamSync: string | null; serverTimeUtc: string }
  liveMatches: LiveMatch[]
  upcoming: Upcoming[]
}

function ago(iso: string | null, now: string): string {
  if (!iso) return 'never'
  const diff = (new Date(now).getTime() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export default function AdminDashboard() {
  const [s, setS] = useState<SystemStatus | null>(null)

  useEffect(() => {
    getSystemStatus().then(setS).catch(() => {})
    const t = setInterval(() => getSystemStatus().then(setS).catch(() => {}), 30000)
    return () => clearInterval(t)
  }, [])

  const e = s?.entities

  return (
    <AdminLayout title="Dashboard">
      <div className="admin-section">
        <h2 className="admin-section-title">System</h2>
        <div className="admin-stats-grid">
          <div className="admin-stat-card"><div className="admin-stat-num">{e?.users ?? '—'}</div><div className="admin-stat-label">Users ({e?.admins ?? 0} admin)</div><Link to="/admin/users" className="admin-stat-link">Manage →</Link></div>
          <div className="admin-stat-card"><div className="admin-stat-num">{e?.groups ?? '—'}</div><div className="admin-stat-label">Groups ({e?.realGroups ?? 0} real / {e?.simGroups ?? 0} sim)</div><Link to="/admin/all-groups" className="admin-stat-link">View →</Link></div>
          <div className={`admin-stat-card ${s && s.liveMatches.length > 0 ? 'admin-stat-card--live' : ''}`}>
            <div className="admin-stat-num">{s?.liveMatches.length ?? '—'}</div>
            <div className="admin-stat-label">Live Now</div>
            {s && s.liveMatches.length > 0 && <div className="admin-live-dot" />}
          </div>
        </div>
        <div className="admin-stats-grid">
          <div className="admin-stat-card"><div className="admin-stat-num">{e?.predictions ?? '—'}</div><div className="admin-stat-label">Predictions</div></div>
          <div className="admin-stat-card"><div className="admin-stat-num">{e?.matches ?? '—'}</div><div className="admin-stat-label">Matches</div></div>
          <div className="admin-stat-card"><div className="admin-stat-num">{e?.pushSubs ?? '—'}</div><div className="admin-stat-label">Push Devices</div></div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Data Sync Health</h2>
        <div className="admin-review-grid">
          <div className="admin-review-item"><span>LAST FIXTURE SYNC</span><strong>{s ? ago(s.sync.lastFixtureSync, s.sync.serverTimeUtc) : '—'}</strong></div>
          <div className="admin-review-item"><span>LAST TEAM SYNC</span><strong>{s ? ago(s.sync.lastTeamSync, s.sync.serverTimeUtc) : '—'}</strong></div>
          <div className="admin-review-item"><span>TEAMS / PLAYERS</span><strong>{e?.teams ?? '—'} / {e?.players ?? '—'}</strong></div>
          <div className="admin-review-item"><span>TEAMS MISSING SQUAD</span><strong>{e?.teamsWithoutPlayers ?? '—'}</strong></div>
        </div>
        <div className="admin-quick-actions" style={{ marginTop: 16 }}>
          <Link to="/admin/sync" className="admin-btn admin-btn--primary">Sync & Compare →</Link>
        </div>
      </div>

      {s && s.liveMatches.length > 0 && (
        <div className="admin-section">
          <h2 className="admin-section-title">Live — being polled</h2>
          <div className="admin-match-list">
            {s.liveMatches.map(m => (
              <Link key={m.id} to={`/admin/matches/${m.id}`} className="admin-match-row admin-match-row--live">
                <span className="admin-live-badge">{m.status}</span>
                <span>{m.home} {m.homeGoals ?? 0} - {m.awayGoals ?? 0} {m.away}</span>
                <span className="admin-match-status">{m.source === 'Simulation' ? 'SIM' : 'WC'} · synced {ago(m.lastSyncedAt, s.sync.serverTimeUtc)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="admin-section">
        <h2 className="admin-section-title">Upcoming</h2>
        {s && s.upcoming.length > 0 ? (
          <div className="admin-match-list">
            {s.upcoming.map(m => (
              <div key={m.id} className="admin-match-row">
                <span>{m.home} vs {m.away}</span>
                <span className="admin-match-status">
                  {m.source === 'Simulation' ? 'SIM' : 'WC'} · {new Date(m.kickoffUtc).toLocaleString()} · {m.lineupsAvailable ? 'lineups ✓' : 'no lineups'}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="admin-empty">No upcoming matches.</p>}
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Quick Actions</h2>
        <div className="admin-quick-actions">
          <Link to="/admin/groups" className="admin-btn admin-btn--secondary">+ New Sim Group</Link>
          <Link to="/admin/matches/new" className="admin-btn admin-btn--secondary">+ New Sim Match</Link>
        </div>
      </div>
    </AdminLayout>
  )
}
