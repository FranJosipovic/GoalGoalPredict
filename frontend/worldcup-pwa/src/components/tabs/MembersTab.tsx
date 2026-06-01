import { useAuthStore } from '../../store/authStore'
import type { GroupDetail } from '../../types'

export default function MembersTab({ group }: { group: GroupDetail }) {
  const { user } = useAuthStore()

  const sorted = [...group.members].sort((a, b) =>
    a.role === 'Owner' ? -1 : b.role === 'Owner' ? 1 : 0
  )

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(group.inviteCode)
  }

  return (
    <div className="members-section">
      <button className="invite-code-btn" onClick={handleCopyCode} style={{ margin: '20px auto', display: 'flex' }}>
        <div>
          <div className="invite-label">Invite Code</div>
          <div className="invite-code">{group.inviteCode}</div>
        </div>
        <span className="invite-copy-icon">📋</span>
      </button>

      <div className="members-header">
        <span className="members-title">MEMBERS</span>
        <span className="members-count">{group.members.length}</span>
      </div>

      <div className="members-list">
        {sorted.map(m => (
          <div key={m.userId} className="member-card">
            <div className="member-avatar">
              {m.firstName[0]}{m.lastName[0]}
            </div>
            <div className="member-info">
              <div className="member-name">
                {m.firstName} {m.lastName}
                {m.userId === user?.id && <span className="member-you"> (you)</span>}
              </div>
              <div className="member-email">{m.email}</div>
            </div>
            {m.role === 'Owner' && <span className="member-role-badge">OWNER</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
