import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { getSimGroups, getSimMatches } from '../../api/admin'

export default function AdminDashboard() {
  const [groups, setGroups] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])

  useEffect(() => {
    getSimGroups().then(setGroups).catch(() => {})
    getSimMatches().then(setMatches).catch(() => {})
  }, [])

  const liveMatches = matches.filter(m => ['1H','HT','2H'].includes(m.status))

  return (
    <AdminLayout title="Dashboard">
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-num">{groups.length}</div>
          <div className="admin-stat-label">Simulation Groups</div>
          <Link to="/admin/groups" className="admin-stat-link">Manage →</Link>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-num">{matches.length}</div>
          <div className="admin-stat-label">Sim Matches</div>
          <Link to="/admin/matches" className="admin-stat-link">View all →</Link>
        </div>
        <div className="admin-stat-card admin-stat-card--live">
          <div className="admin-stat-num">{liveMatches.length}</div>
          <div className="admin-stat-label">Live Now</div>
          {liveMatches.length > 0 && <div className="admin-live-dot" />}
        </div>
      </div>

      {liveMatches.length > 0 && (
        <div className="admin-section">
          <h2 className="admin-section-title">Live Matches</h2>
          <div className="admin-match-list">
            {liveMatches.map(m => (
              <Link key={m.id} to={`/admin/matches/${m.id}`} className="admin-match-row admin-match-row--live">
                <span className="admin-live-badge">LIVE</span>
                <span>{m.homeTeam.name} {m.homeGoals ?? 0} - {m.awayGoals ?? 0} {m.awayTeam.name}</span>
                <span className="admin-match-status">{m.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="admin-section">
        <h2 className="admin-section-title">Quick Actions</h2>
        <div className="admin-quick-actions">
          <Link to="/admin/groups/new" className="admin-btn admin-btn--primary">+ New Sim Group</Link>
          <Link to="/admin/matches/new" className="admin-btn admin-btn--secondary">+ New Sim Match</Link>
        </div>
      </div>
    </AdminLayout>
  )
}
