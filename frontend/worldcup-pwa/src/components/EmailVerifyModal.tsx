import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, resendVerification, linkGoogleAuthed } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import GoogleSignInButton from './GoogleSignInButton'

/**
 * Blocking modal shown to a logged-in user whose email isn't verified (e.g. an
 * existing player after the auth upgrade). There's no dismiss — they must verify
 * via the emailed link or by linking Google. The verification email is only sent
 * when the user presses the button (not automatically).
 */
export default function EmailVerifyModal() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // Sessions created before this release stored a user without `emailVerified`.
  // Refresh from the server once so the modal reflects the real state.
  useEffect(() => {
    if (user && user.emailVerified === undefined) {
      getMe().then(setUser).catch(() => {})
    }
  }, [user, setUser])

  if (!user || user.emailVerified !== false) return null

  const handleSend = async () => {
    setError('')
    setSending(true)
    try {
      await resendVerification(user.email)
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  const handleSignOut = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="verify-modal-overlay" role="dialog" aria-modal="true">
      <div className="verify-modal">
        <div className="verify-icon">📧</div>
        <h2 className="verify-title">Verify your email</h2>
        <p className="verify-text">
          To secure your account, verify <strong>{user.email}</strong>. Send yourself the link and
          open it — or link Google to confirm instantly. Your points and groups stay with you either way.
        </p>

        {sent && <p className="verify-sent">✓ Verification link sent. Check your inbox.</p>}
        <button type="button" className="btn-secondary" onClick={handleSend} disabled={sending}>
          {sending
            ? <span className="spinner spinner-dark" />
            : sent ? 'Resend verification link' : 'Send verification link'}
        </button>

        <div className="auth-divider"><span>or</span></div>
        <GoogleSignInButton
          onError={setError}
          onCredential={async (credential) => {
            // Link Google to THIS account (proven by JWT) — keeps Id/points and switches
            // the account email to the Google one even if it differs from the stored email.
            const data = await linkGoogleAuthed(credential)
            setAuth(data.token, data.user)
          }}
        />
        {error && <div className="error-msg">{error}</div>}

        <button type="button" className="auth-link back-link" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
