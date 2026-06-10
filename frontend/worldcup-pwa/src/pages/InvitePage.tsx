import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGroupPreview, joinGroup } from '../api/groups'
import { useAuthStore } from '../store/authStore'
import { setPendingInvite } from '../lib/invite'
import type { GroupPreview } from '../types'

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [preview, setPreview] = useState<GroupPreview | null>(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!code) return
    const upper = code.toUpperCase()

    // Logged in → join immediately and go to the group.
    if (token) {
      setJoining(true)
      joinGroup(upper)
        .then((g) => navigate(`/groups/${g.id}/matches`, { replace: true }))
        .catch(async (err) => {
          // Already a member? Resolve the group id and just open it.
          if (err.response?.status === 400) {
            try {
              const p = await getGroupPreview(upper)
              navigate(`/groups/${p.id}/matches`, { replace: true })
              return
            } catch { /* fall through to error */ }
          }
          setError(err.response?.data?.error ?? 'This invite link is not valid.')
          setJoining(false)
        })
      return
    }

    // Not logged in → show a preview and prompt to sign up / sign in.
    getGroupPreview(upper)
      .then(setPreview)
      .catch(() => setError('This invite link is not valid or has expired.'))
  }, [code, token, navigate])

  const goAuth = (path: '/register' | '/login') => {
    if (code) setPendingInvite(code.toUpperCase())
    navigate(path, { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-decoration">
        <div className="deco-circle deco-1" />
        <div className="deco-circle deco-2" />
        <div className="pitch-lines" />
      </div>

      <div className="auth-card">
        <div className="auth-brand">
          <div className="ball-icon">⚽</div>
          <h1 className="brand-name">GOAL<span className="brand-accent">GOAL</span></h1>
          <p className="brand-sub">PREDICT</p>
        </div>

        {error && (
          <>
            <h2 className="auth-heading">Invite link</h2>
            <div className="error-msg">{error}</div>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/groups')}>
              Go to my groups
            </button>
          </>
        )}

        {!error && (joining || (token && !preview)) && (
          <>
            <h2 className="auth-heading">Joining…</h2>
            <div className="loading-state"><span className="loading-ball">⚽</span></div>
          </>
        )}

        {!error && !token && preview && (
          <>
            <h2 className="auth-heading">You're invited!</h2>
            <p className="auth-sub">
              Join <strong>{preview.name}</strong> · {preview.memberCount}{' '}
              {preview.memberCount === 1 ? 'member' : 'members'}
            </p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => goAuth('/register')}>
              CREATE ACCOUNT & JOIN
            </button>
            <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => goAuth('/login')}>
              I already have an account
            </button>
          </>
        )}
      </div>
    </div>
  )
}
