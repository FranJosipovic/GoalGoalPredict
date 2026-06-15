import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { consumePendingInvite } from '../lib/invite'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    // StrictMode double-invokes effects; the token is single-use, so guard it.
    if (ran.current) return
    ran.current = true

    const token = params.get('token')
    if (!token) {
      setStatus('error')
      setMessage('This verification link is missing its token.')
      return
    }

    verifyEmail(token)
      .then(async (data) => {
        setAuth(data.token, data.user)
        setStatus('success')
        const groupId = await consumePendingInvite()
        setTimeout(() => navigate(groupId ? `/groups/${groupId}/matches` : '/groups', { replace: true }), 1200)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.error ?? 'We could not verify this link.')
      })
  }, [params, navigate, setAuth])

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

        <div className="verify-prompt">
          {status === 'verifying' && (
            <>
              <span className="spinner spinner-dark" />
              <p className="verify-title">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="verify-icon">✅</div>
              <p className="verify-title">Email verified!</p>
              <p className="verify-text">Taking you to your competitions…</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="verify-icon">⚠️</div>
              <p className="verify-title">Verification failed</p>
              <p className="verify-text">{message}</p>
              <Link to="/login" className="btn-secondary">Back to sign in</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
