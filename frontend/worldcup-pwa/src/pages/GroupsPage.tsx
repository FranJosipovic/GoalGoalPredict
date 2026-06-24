import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGroups, createGroup, joinGroup } from '../api/groups'
import { useAuthStore } from '../store/authStore'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import Layout from '../components/Layout'
import type { Group } from '../types'

export default function GroupsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const { canInstall, install } = useInstallPrompt()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'join' | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    getGroups()
      .then(setGroups)
      .finally(() => setLoading(false))
  }, [])

  const openModal = (type: 'create' | 'join') => {
    setModal(type)
    setInputValue('')
    setActionError('')
  }

  const closeModal = () => {
    setModal(null)
    setActionError('')
  }

  const handleAction = async () => {
    if (!inputValue.trim()) return
    setActionError('')
    setActionLoading(true)
    try {
      const group = modal === 'create'
        ? await createGroup(inputValue.trim())
        : await joinGroup(inputValue.trim().toUpperCase())
      setGroups((g) => [group, ...g])
      closeModal()
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? 'Something went wrong.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Layout>
      <div className="groups-page">
        <div className="groups-hero">
          <div className="hero-greeting">
            WELCOME BACK,{' '}
            <span className="hero-name">{user?.firstName?.toUpperCase()}</span>
          </div>
          <h2 className="hero-title">Your Competitions</h2>
          <p className="hero-sub">Predict. Compete. Win.</p>
        </div>

        {canInstall && (
          <div className="install-banner" onClick={install}>
            <div className="install-banner-left">
              <span className="install-banner-icon">📲</span>
              <div>
                <div className="install-banner-title">Install app</div>
                <div className="install-banner-sub">Add GoalGoalPredict to home screen</div>
              </div>
            </div>
            <button className="install-banner-btn">Install</button>
          </div>
        )}

        <div className="groups-actions">
          <button className="btn-primary" onClick={() => openModal('create')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create group
          </button>
          <button className="btn-secondary" onClick={() => openModal('join')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            Join group
          </button>
        </div>

        <div className="groups-list">
          {loading && (
            <div className="loading-state">
              <div className="loading-ball">⚽</div>
            </div>
          )}

          {!loading && groups.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <p className="empty-title">No competitions yet</p>
              <p className="empty-sub">Create one or join with an invite code</p>
            </div>
          )}

          {groups.map((group, i) =>
            group.isGlobal ? (
              <div
                key={group.id}
                className={`group-card group-card--global ${group.isLocked ? 'group-card--locked' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => navigate(`/groups/${group.id}/matches`)}
              >
                <div className="group-card-left">
                  <div className="group-card-icon group-card-icon--global">
                    {group.isLocked ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    ) : '🏆'}
                  </div>
                  <div>
                    <div className="group-card-name">
                      {group.name}
                      <span className="global-badge">GLOBAL</span>
                    </div>
                    <div className="group-card-sub--global">
                      {group.isLocked ? 'Unlocks at the knockout phase' : 'Everyone competes · live now'}
                    </div>
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-card-arrow">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            ) : (
              <div
                key={group.id}
                className="group-card"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => navigate(`/groups/${group.id}/matches`)}
              >
                <div className="group-card-left">
                  <div className="group-card-icon">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="group-card-name">{group.name}</div>
                    <div className="group-card-code">#{group.inviteCode}</div>
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-card-arrow">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            )
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {modal === 'create' ? 'New Competition' : 'Join Competition'}
            </h3>
            <p className="modal-sub">
              {modal === 'create'
                ? 'Give your group a name'
                : 'Enter the 6-character invite code'}
            </p>
            <input
              className="field-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={modal === 'create' ? 'Champions League Pub League' : 'ABC123'}
              maxLength={modal === 'join' ? 6 : 60}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAction()}
            />
            {actionError && <div className="error-msg">{actionError}</div>}
            <div className="modal-actions">
              <button className="btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" onClick={handleAction} disabled={actionLoading}>
                {actionLoading ? <span className="spinner" /> : modal === 'create' ? 'Create' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
