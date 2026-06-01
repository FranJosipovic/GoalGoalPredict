import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getSimGroups, createSimGroup } from '../../api/admin'

export default function AdminGroups() {
  const [groups, setGroups] = useState<any[]>([])
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => getSimGroups().then(setGroups).catch(() => {})
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      await createSimGroup(name.trim())
      setName('')
      load()
    } finally {
      setCreating(false)
    }
  }

  return (
    <AdminLayout title="Simulation Groups">
      <div className="admin-section">
        <h2 className="admin-section-title">Create Group</h2>
        <div className="admin-form-row">
          <input
            className="admin-input"
            placeholder="Group name..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button className="admin-btn admin-btn--primary" onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">All Simulation Groups</h2>
        {groups.length === 0
          ? <p className="admin-empty">No simulation groups yet.</p>
          : (
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Invite Code</th><th>Members</th><th>Created</th></tr></thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td><code className="admin-code">{g.inviteCode}</code></td>
                    <td>{g.members}</td>
                    <td>{new Date(g.createdAt).toLocaleDateString()}</td>
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
