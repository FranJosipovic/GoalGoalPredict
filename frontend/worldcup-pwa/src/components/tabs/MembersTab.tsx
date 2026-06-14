import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { resetInviteCode, kickGroupMember } from '../../api/groups'
import type { GroupDetail } from '../../types'

export default function MembersTab({ group }: { group: GroupDetail }) {
  const { user } = useAuthStore()
  const isOwner = group.createdByUserId === user?.id

  const [inviteCode, setInviteCode] = useState(group.inviteCode)
  const [feedback, setFeedback] = useState('')
  const [resetting, setResetting] = useState(false)
  const [members, setMembers] = useState(group.members)
  const [kicking, setKicking] = useState<string | null>(null)

  const inviteLink = `${window.location.origin}/invite/${inviteCode}`

  const sorted = [...members].sort((a, b) =>
    a.role === 'Owner' ? -1 : b.role === 'Owner' ? 1 : 0
  )

  const flash = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2000)
  }

  const handleShare = async () => {
    const shareData = {
      title: group.name,
      text: `Join "${group.name}" on GoalGoalPredict!`,
      url: inviteLink,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // user cancelled or share failed — fall back to copy
      }
    }
    await navigator.clipboard.writeText(inviteLink)
    flash('Invite link copied!')
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode)
    flash('Code copied!')
  }

  const handleKick = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the group? Their predictions and points here will be deleted.`)) return
    setKicking(userId)
    try {
      await kickGroupMember(group.id, userId)
      setMembers(prev => prev.filter(m => m.userId !== userId))
      flash(`${name} removed.`)
    } catch (e: any) {
      flash(e.response?.data?.error ?? 'Could not remove member.')
    } finally {
      setKicking(null)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset the invite link? The old link will stop working.')) return
    setResetting(true)
    try {
      const updated = await resetInviteCode(group.id)
      setInviteCode(updated.inviteCode)
      flash('New invite link generated.')
    } catch {
      flash('Could not reset link.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="members-section">
      <div className="invite-share" style={{ margin: '20px auto', maxWidth: 420 }}>
        <button className="btn-primary" onClick={handleShare} style={{ width: '100%' }}>
          🔗 Invite people
        </button>

        <button className="invite-code-btn" onClick={handleCopyCode} style={{ margin: '12px auto', display: 'flex' }}>
          <div>
            <div className="invite-label">Invite Code</div>
            <div className="invite-code">{inviteCode}</div>
          </div>
          <span className="invite-copy-icon">📋</span>
        </button>

        {isOwner && (
          <button className="btn-ghost" onClick={handleReset} disabled={resetting} style={{ width: '100%' }}>
            {resetting ? 'Resetting…' : '↻ Reset invite link'}
          </button>
        )}

        {feedback && <div className="invite-feedback" style={{ textAlign: 'center', marginTop: 8 }}>{feedback}</div>}
      </div>

      <div className="members-header">
        <span className="members-title">MEMBERS</span>
        <span className="members-count">{members.length}</span>
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
            {isOwner && m.role !== 'Owner' && m.userId !== user?.id && (
              <button
                className="member-kick-btn"
                onClick={() => handleKick(m.userId, `${m.firstName} ${m.lastName}`)}
                disabled={kicking === m.userId}
                aria-label={`Remove ${m.firstName} ${m.lastName}`}
              >
                {kicking === m.userId ? '…' : '✕'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
