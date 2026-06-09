import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAllGroups, deleteGroup } from '../../api/admin'

interface AdminGroup {
  id: string; name: string; inviteCode: string; isSimulation: boolean
  createdAt: string; owner: string | null
  members: number; predictions: number; matches: number
}

type Filter = 'all' | 'real' | 'sim'

export default function AdminAllGroups() {
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = (term?: string, f: Filter = filter) =>
    getAllGroups(term, f === 'all' ? undefined : f).then(setGroups).catch(() => setErr('Failed to load groups'))

  useEffect(() => { load(q, filter) /* eslint-disable-next-line */ }, [filter])

  const handleDelete = async (g: AdminGroup) => {
    if (!confirm(`Delete group "${g.name}"? This removes all members, predictions and scores${g.isSimulation ? ' and its simulation matches' : ''}. This cannot be undone.`)) return
    setBusy(g.id); setErr(null)
    try {
      await deleteGroup(g.id)
      setGroups(prev => prev.filter(x => x.id !== g.id))
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Delete failed')
    } finally { setBusy(null) }
  }

  return (
    <AdminLayout title="All Groups">
      {err && <div className="admin-error">{err}</div>}

      <div className="admin-section">
        <div className="admin-form-row" style={{ alignItems: 'center' }}>
          <input className="admin-input" placeholder="Search by name or invite code…"
            value={q} onChange={e => { setQ(e.target.value); load(e.target.value) }} />
          <div className="admin-formation-pills" style={{ margin: 0 }}>
            {(['all', 'real', 'sim'] as Filter[]).map(f => (
              <button key={f} className={`admin-pill ${filter === f ? 'admin-pill--active' : ''}`}
                onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'real' ? 'Real' : 'Simulation'}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">{groups.length} Groups</h2>
        {groups.length === 0
          ? <p className="admin-empty">No groups found.</p>
          : (
            <table className="admin-table">
              <thead><tr>
                <th>Name</th><th>Type</th><th>Owner</th><th>Code</th>
                <th>Members</th><th>Preds</th><th>Created</th><th></th>
              </tr></thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.id}>
                    <td><Link className="admin-link" to={`/admin/all-groups/${g.id}`}>{g.name}</Link></td>
                    <td>{g.isSimulation ? <span className="admin-dim">Sim</span> : 'Real'}</td>
                    <td className="admin-dim">{g.owner ?? '—'}</td>
                    <td><code className="admin-code">{g.inviteCode}</code></td>
                    <td>{g.members}</td>
                    <td>{g.predictions}</td>
                    <td className="admin-dim">{new Date(g.createdAt).toLocaleDateString()}</td>
                    <td className="admin-row-actions">
                      <button className="admin-btn admin-btn--danger admin-btn--xs" disabled={busy === g.id}
                        onClick={() => handleDelete(g)}>Delete</button>
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
