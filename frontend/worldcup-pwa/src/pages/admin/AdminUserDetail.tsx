import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminUser } from '../../api/admin'

interface UserGroup {
  id: string; name: string; isSimulation: boolean; role: string
  isOwner: boolean; points: number; predictions: number
}
interface UserDetail {
  id: string; email: string; firstName: string; lastName: string
  isAdmin: boolean; createdAt: string
  pushCount: number; totalPoints: number; totalPredictions: number
  groups: UserGroup[]
}

export default function AdminUserDetail() {
  const { id } = useParams()
  const [u, setU] = useState<UserDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (id) getAdminUser(id).then(setU).catch(() => setErr('Failed to load user'))
  }, [id])

  if (err) return <AdminLayout title="User"><div className="admin-error">{err}</div></AdminLayout>
  if (!u) return <AdminLayout title="User"><p className="admin-empty">Loading…</p></AdminLayout>

  return (
    <AdminLayout title={`${u.firstName} ${u.lastName}`}>
      <Link to="/admin/users" className="admin-link">← All users</Link>

      <div className="admin-section" style={{ marginTop: 16 }}>
        <div className="admin-stats-grid">
          <div className="admin-stat-card"><div className="admin-stat-num">{u.groups.length}</div><div className="admin-stat-label">Groups</div></div>
          <div className="admin-stat-card"><div className="admin-stat-num">{u.totalPredictions}</div><div className="admin-stat-label">Predictions</div></div>
          <div className="admin-stat-card"><div className="admin-stat-num">{u.totalPoints}</div><div className="admin-stat-label">Total Points</div></div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Account</h2>
        <div className="admin-review-grid">
          <div className="admin-review-item"><span>EMAIL</span><strong>{u.email}</strong></div>
          <div className="admin-review-item"><span>ROLE</span><strong>{u.isAdmin ? 'Admin' : 'User'}</strong></div>
          <div className="admin-review-item"><span>JOINED</span><strong>{new Date(u.createdAt).toLocaleString()}</strong></div>
          <div className="admin-review-item"><span>PUSH DEVICES</span><strong>{u.pushCount}</strong></div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Group Memberships</h2>
        {u.groups.length === 0
          ? <p className="admin-empty">Not a member of any group.</p>
          : (
            <table className="admin-table">
              <thead><tr><th>Group</th><th>Type</th><th>Role</th><th>Preds</th><th>Points</th></tr></thead>
              <tbody>
                {u.groups.map(g => (
                  <tr key={g.id}>
                    <td><Link className="admin-link" to={`/admin/all-groups/${g.id}`}>{g.name}</Link></td>
                    <td className="admin-dim">{g.isSimulation ? 'Simulation' : 'Real'}</td>
                    <td>{g.isOwner ? <span className="admin-diff-state admin-diff-state--mismatch">OWNER</span> : g.role}</td>
                    <td>{g.predictions}</td>
                    <td>{g.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </AdminLayout>
  )
}
