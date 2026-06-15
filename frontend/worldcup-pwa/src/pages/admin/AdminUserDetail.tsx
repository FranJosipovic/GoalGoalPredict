import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminUser, setUserPassword } from '../../api/admin'

interface UserGroup {
  id: string; name: string; isSimulation: boolean; role: string
  isOwner: boolean; points: number; predictions: number
}
interface UserDetail {
  id: string; email: string; firstName: string; lastName: string
  isAdmin: boolean; createdAt: string
  emailVerified: boolean; isGoogle: boolean
  pushCount: number; totalPoints: number; totalPredictions: number
  groups: UserGroup[]
}

export default function AdminUserDetail() {
  const { id } = useParams()
  const [u, setU] = useState<UserDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)

  useEffect(() => {
    if (id) getAdminUser(id).then(setU).catch(() => setErr('Failed to load user'))
  }, [id])

  const handleSetPassword = async () => {
    if (!id || newPassword.length < 6) return
    setPwSaving(true)
    setPwMsg(null)
    try {
      const res = await setUserPassword(id, newPassword)
      setPwMsg(res?.message ?? 'Password updated')
      setNewPassword('')
    } catch (e: any) {
      setPwMsg(e.response?.data?.message ?? 'Failed to update password')
    } finally {
      setPwSaving(false)
    }
  }

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
          <div className="admin-review-item">
            <span>EMAIL STATUS</span>
            <strong>
              {u.emailVerified
                ? <span className="admin-diff-state admin-diff-state--match">✓ Verified</span>
                : <span className="admin-diff-state admin-diff-state--mismatch">✗ Unverified</span>}
            </strong>
          </div>
          <div className="admin-review-item"><span>SIGN-IN</span><strong>{u.isGoogle ? 'Google' : 'Email / password'}</strong></div>
          <div className="admin-review-item"><span>ROLE</span><strong>{u.isAdmin ? 'Admin' : 'User'}</strong></div>
          <div className="admin-review-item"><span>JOINED</span><strong>{new Date(u.createdAt).toLocaleString()}</strong></div>
          <div className="admin-review-item"><span>PUSH DEVICES</span><strong>{u.pushCount}</strong></div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Reset Password</h2>
        <p className="admin-empty" style={{ marginTop: 0 }}>Set a new password for this user. Tell them the new password directly.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="field-input"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <button
            className="btn-primary"
            onClick={handleSetPassword}
            disabled={pwSaving || newPassword.length < 6}
          >
            {pwSaving ? 'Saving…' : 'Set password'}
          </button>
        </div>
        {pwMsg && <p className="admin-empty" style={{ marginBottom: 0 }}>{pwMsg}</p>}
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
