import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { getSimMatches } from '../../api/admin'

const STATUS_COLOR: Record<string, string> = {
  NS: '#888', '1H': '#4caf50', HT: '#ff9800', '2H': '#4caf50', FT: '#607d8b'
}

export default function AdminMatches() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSimMatches().then(setMatches).finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout title="Simulation Matches">
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="admin-section-title" style={{ margin: 0 }}>All Matches</h2>
          <Link to="/admin/matches/new" className="admin-btn admin-btn--primary">+ New Match</Link>
        </div>

        {loading
          ? <p className="admin-empty">Loading...</p>
          : matches.length === 0
            ? <p className="admin-empty">No simulation matches yet.</p>
            : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Match</th><th>Kickoff</th><th>Status</th><th>Score</th><th>Group</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <tr key={m.id}>
                      <td>{m.homeTeam.name} vs {m.awayTeam.name}</td>
                      <td>{new Date(m.kickoffUtc).toLocaleString()}</td>
                      <td>
                        <span className="admin-status-badge" style={{ background: STATUS_COLOR[m.status] ?? '#888' }}>
                          {m.status}
                        </span>
                      </td>
                      <td>{m.homeGoals ?? '—'} : {m.awayGoals ?? '—'}</td>
                      <td><span style={{ fontSize: 12, color: '#888' }}>{m.simulationGroupId?.slice(0, 8)}...</span></td>
                      <td><Link to={`/admin/matches/${m.id}`} className="admin-link">View →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>
    </AdminLayout>
  )
}
