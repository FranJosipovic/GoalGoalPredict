import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAllGroupDetail, removeGroupMember, transferGroupOwner, deleteGroup } from '../../api/admin'

interface Member {
  id: string; email: string; firstName: string; lastName: string
  role: string; joinedAt: string; isOwner: boolean
  points: number; predictions: number
}
interface GroupDetail {
  id: string; name: string; inviteCode: string; isSimulation: boolean
  createdAt: string; members: Member[]
}

export default function AdminGroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [g, setG] = useState<GroupDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    if (id) getAllGroupDetail(id).then(setG).catch(() => setErr('Failed to load group'))
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRemove = async (m: Member) => {
    if (!id) return
    if (!confirm(`Remove ${m.firstName} ${m.lastName} from the group? Their predictions and scores here will be deleted.`)) return
    setBusy(m.id); setErr(null)
    try { await removeGroupMember(id, m.id); load() }
    catch (e: any) { setErr(e?.response?.data?.message ?? 'Remove failed') }
    finally { setBusy(null) }
  }

  const handleTransfer = async (m: Member) => {
    if (!id) return
    if (!confirm(`Make ${m.firstName} ${m.lastName} the new owner of this group?`)) return
    setBusy(m.id); setErr(null)
    try { await transferGroupOwner(id, m.id); load() }
    catch (e: any) { setErr(e?.response?.data?.message ?? 'Transfer failed') }
    finally { setBusy(null) }
  }

  const handleDeleteGroup = async () => {
    if (!id || !g) return
    if (!confirm(`Delete group "${g.name}"? This removes all members, predictions and scores${g.isSimulation ? ' and its simulation matches' : ''}. This cannot be undone.`)) return
    setBusy('group'); setErr(null)
    try { await deleteGroup(id); navigate('/admin/all-groups') }
    catch (e: any) { setErr(e?.response?.data?.message ?? 'Delete failed'); setBusy(null) }
  }

  if (err && !g) return <AdminLayout title="Group"><div className="admin-error">{err}</div></AdminLayout>
  if (!g) return <AdminLayout title="Group"><p className="admin-empty">Loading…</p></AdminLayout>

  return (
    <AdminLayout title={g.name}>
      <Link to="/admin/all-groups" className="admin-link">← All groups</Link>
      {err && <div className="admin-error" style={{ marginTop: 12 }}>{err}</div>}

      <div className="admin-section" style={{ marginTop: 16 }}>
        <div className="admin-review-grid">
          <div className="admin-review-item"><span>TYPE</span><strong>{g.isSimulation ? 'Simulation' : 'Real'}</strong></div>
          <div className="admin-review-item"><span>INVITE CODE</span><strong><code className="admin-code">{g.inviteCode}</code></strong></div>
          <div className="admin-review-item"><span>MEMBERS</span><strong>{g.members.length}</strong></div>
          <div className="admin-review-item"><span>CREATED</span><strong>{new Date(g.createdAt).toLocaleString()}</strong></div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Members</h2>
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Preds</th><th>Points</th><th></th></tr></thead>
          <tbody>
            {g.members.map(m => (
              <tr key={m.id}>
                <td><Link className="admin-link" to={`/admin/users/${m.id}`}>{m.firstName} {m.lastName}</Link></td>
                <td className="admin-dim">{m.email}</td>
                <td>{m.isOwner ? <span className="admin-diff-state admin-diff-state--mismatch">OWNER</span> : m.role}</td>
                <td>{m.predictions}</td>
                <td>{m.points}</td>
                <td className="admin-row-actions">
                  {!m.isOwner && (
                    <>
                      <button className="admin-btn admin-btn--ghost admin-btn--xs" disabled={busy === m.id}
                        onClick={() => handleTransfer(m)}>Make owner</button>
                      <button className="admin-btn admin-btn--danger admin-btn--xs" disabled={busy === m.id}
                        onClick={() => handleRemove(m)}>Remove</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Danger Zone</h2>
        <button className="admin-btn admin-btn--danger" disabled={busy === 'group'}
          onClick={handleDeleteGroup}>Delete this group</button>
      </div>
    </AdminLayout>
  )
}
