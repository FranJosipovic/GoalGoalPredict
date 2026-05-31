import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getGroupDetail } from '../api/groups'
import { useAuthStore } from '../store/authStore'
import Layout from '../components/Layout'
import type { GroupDetail } from '../types'

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    getGroupDetail(id)
      .then(setGroup)
      .finally(() => setLoading(false))
  }, [id])

  const copyInviteCode = () => {
    if (!group) return
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <Layout showBack>
        <div className="loading-state">
          <div className="loading-ball">⚽</div>
        </div>
      </Layout>
    )
  }

  if (!group) {
    return (
      <Layout showBack title="Not Found">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <p className="empty-title">Group not found</p>
        </div>
      </Layout>
    )
  }

  const owner = group.members.find((m) => m.role === 'Owner')
  const isOwner = owner?.userId === user?.id

  return (
    <Layout title={group.name} showBack>
      <div className="detail-page">
        <div className="detail-hero">
          <div className="detail-group-icon">
            {group.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="detail-name">{group.name}</h1>

          <button className="invite-code-btn" onClick={copyInviteCode}>
            <span className="invite-label">Invite code</span>
            <span className="invite-code">{group.inviteCode}</span>
            <span className="invite-copy-icon">
              {copied ? '✓' : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </span>
          </button>
        </div>

        <div className="members-section">
          <div className="members-header">
            <h2 className="members-title">MEMBERS</h2>
            <span className="members-count">{group.members.length}</span>
          </div>

          <div className="members-list">
            {group.members
              .sort((a) => (a.role === 'Owner' ? -1 : 1))
              .map((member, i) => (
                <div key={member.userId} className="member-card" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="member-avatar">
                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {member.firstName} {member.lastName}
                      {member.userId === user?.id && (
                        <span className="member-you"> (you)</span>
                      )}
                    </div>
                    <div className="member-email">{member.email}</div>
                  </div>
                  {member.role === 'Owner' && (
                    <span className="member-role-badge">OWNER</span>
                  )}
                </div>
              ))}
          </div>
        </div>

        {isOwner && (
          <div className="detail-footer-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            You are the owner of this competition
          </div>
        )}
      </div>
    </Layout>
  )
}
