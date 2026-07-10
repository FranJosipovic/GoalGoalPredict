import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { resetInviteCode, kickGroupMember } from '../../api/groups'
import Icon from '../Icon'
import type { GroupDetail } from '../../types'

export default function MembersTab({ group }: { group: GroupDetail }) {
  const { user } = useAuthStore()
  const { t } = useTranslation()
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
      text: t('groupDetail.shareText', { name: group.name }),
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
    flash(t('groupDetail.inviteLinkCopied'))
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode)
    flash(t('groupDetail.codeCopied'))
  }

  const handleKick = async (userId: string, name: string) => {
    if (!confirm(t('groupDetail.confirmRemoveBody', { name }))) return
    setKicking(userId)
    try {
      await kickGroupMember(group.id, userId)
      setMembers(prev => prev.filter(m => m.userId !== userId))
      flash(t('groupDetail.memberRemoved', { name }))
    } catch (e: any) {
      flash(e.response?.data?.error ?? t('groupDetail.removeMemberFailed'))
    } finally {
      setKicking(null)
    }
  }

  const handleReset = async () => {
    if (!confirm(`${t('groupDetail.confirmResetTitle')} ${t('groupDetail.confirmResetBody')}`)) return
    setResetting(true)
    try {
      const updated = await resetInviteCode(group.id)
      setInviteCode(updated.inviteCode)
      flash(t('groupDetail.newLinkGenerated'))
    } catch {
      flash(t('groupDetail.resetLinkFailed'))
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="members-section">
      <div className="invite-share" style={{ margin: '20px auto', maxWidth: 420 }}>
        <button className="btn-primary btn-with-icon" onClick={handleShare} style={{ width: '100%' }}>
          <Icon name="link" size={18} /> {t('groupDetail.invitePeople')}
        </button>

        <button className="invite-code-btn" onClick={handleCopyCode} style={{ margin: '12px auto', display: 'flex' }}>
          <div>
            <div className="invite-label">{t('groupDetail.inviteCodeLabel')}</div>
            <div className="invite-code">{inviteCode}</div>
          </div>
          <span className="invite-copy-icon"><Icon name="copy" size={18} /></span>
        </button>

        {isOwner && (
          <button className="btn-ghost" onClick={handleReset} disabled={resetting} style={{ width: '100%' }}>
            {resetting ? t('groupDetail.resetting') : t('groupDetail.resetLink')}
          </button>
        )}

        {feedback && <div className="invite-feedback" style={{ textAlign: 'center', marginTop: 8 }}>{feedback}</div>}
      </div>

      <div className="members-header">
        <span className="members-title">{t('groupDetail.membersHeader')}</span>
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
                {m.userId === user?.id && <span className="member-you"> {t('groupDetail.youParen')}</span>}
              </div>
            </div>
            {m.role === 'Owner' && <span className="member-role-badge">{t('groupDetail.roleOwner')}</span>}
            {isOwner && m.role !== 'Owner' && m.userId !== user?.id && (
              <button
                className="member-kick-btn"
                onClick={() => handleKick(m.userId, `${m.firstName} ${m.lastName}`)}
                disabled={kicking === m.userId}
                aria-label={t('groupDetail.removeAria', { name: `${m.firstName} ${m.lastName}` })}
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
