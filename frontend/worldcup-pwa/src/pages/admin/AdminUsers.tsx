import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminUsers, deleteUser, setUserAdmin } from '../../api/admin'

interface AdminUser {
  id: string; email: string; firstName: string; lastName: string
  isAdmin: boolean; createdAt: string
  groups: number; predictions: number; hasPush: boolean
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [q, setQ] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = (term?: string) =>
    getAdminUsers(term).then(setUsers).catch(() => setErr('Failed to load users'))

  useEffect(() => { load() }, [])

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.email}? This removes their predictions, scores and memberships. This cannot be undone.`)) return
    setBusy(u.id); setErr(null)
    try {
      await deleteUser(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Delete failed')
    } finally { setBusy(null) }
  }

  const handleToggleAdmin = async (u: AdminUser) => {
    setBusy(u.id); setErr(null)
    try {
      const r = await setUserAdmin(u.id, !u.isAdmin)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isAdmin: r.isAdmin } : x))
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Update failed')
    } finally { setBusy(null) }
  }

  return (
    <AdminLayout title="Users">
      {err && <div className="admin-error">{err}</div>}

      <div className="admin-section">
        <div className="admin-form-row">
          <input className="admin-input" placeholder="Search by name or email…"
            value={q}
            onChange={e => { setQ(e.target.value); load(e.target.value) }} />
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">{users.length} Registered Users</h2>
        {users.length === 0
          ? <p className="admin-empty">No users found.</p>
          : (
            <table className="admin-table">
              <thead><tr>
                <th>Name</th><th>Email</th><th>Groups</th><th>Preds</th>
                <th>Push</th><th>Joined</th><th>Role</th><th></th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><Link className="admin-link" to={`/admin/users/${u.id}`}>{u.firstName} {u.lastName}</Link></td>
                    <td className="admin-dim">{u.email}</td>
                    <td>{u.groups}</td>
                    <td>{u.predictions}</td>
                    <td>{u.hasPush ? '🔔' : '—'}</td>
                    <td className="admin-dim">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>{u.isAdmin ? <span className="admin-diff-state admin-diff-state--mismatch">ADMIN</span> : <span className="admin-dim">user</span>}</td>
                    <td className="admin-row-actions">
                      <button className="admin-btn admin-btn--ghost admin-btn--xs" disabled={busy === u.id}
                        onClick={() => handleToggleAdmin(u)}>
                        {u.isAdmin ? 'Revoke' : 'Make admin'}
                      </button>
                      <button className="admin-btn admin-btn--danger admin-btn--xs" disabled={busy === u.id}
                        onClick={() => handleDelete(u)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </AdminLayout>
  )
}
