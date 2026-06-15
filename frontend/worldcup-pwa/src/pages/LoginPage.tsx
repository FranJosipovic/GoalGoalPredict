import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, resendVerification, linkGoogleWithCredentials } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { consumePendingInvite } from '../lib/invite'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  // Already authenticated (e.g. navigated back here)? Send them home, not to a
  // login form that looks like they were logged out.
  useEffect(() => {
    if (useAuthStore.getState().token) navigate('/groups', { replace: true })
  }, [navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Set when login is rejected because the email isn't verified yet (existing-user
  // migration path). Shows the verify prompt with a resend option.
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverified(false)
    setResent(false)
    setLoading(true)
    try {
      const data = await login({ email, password })
      setAuth(data.token, data.user)
      const groupId = await consumePendingInvite()
      navigate(groupId ? `/groups/${groupId}/matches` : '/groups')
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.code === 'email_not_verified') {
        setUnverified(true)
      } else {
        setError(err.response?.data?.error ?? 'Login failed. Check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await resendVerification(email)
      setResent(true)
    } catch {
      setResent(true) // endpoint always succeeds; never reveal account existence
    }
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

        <h2 className="auth-heading">Welcome back</h2>
        <p className="auth-sub">Sign in to your competition</p>

        {unverified ? (
          <div className="verify-prompt">
            <div className="verify-icon">📧</div>
            <p className="verify-title">Verify your email to continue</p>
            <p className="verify-text">
              We've upgraded account security. Verify <strong>{email}</strong> — send yourself the
              link and open it, or sign in with Google to confirm instantly (your points stay with you).
            </p>
            {resent && <p className="verify-sent">✓ Verification link sent. Check your inbox.</p>}
            <button type="button" className="btn-secondary" onClick={handleResend}>
              {resent ? 'Resend verification link' : 'Send verification link'}
            </button>
            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton
              onError={setError}
              onCredential={async (credential) => {
                // The typed email+password are valid (login only failed on verification),
                // so use them to link Google to this existing account — even if the chosen
                // Google address differs. Keeps the account's Id/points; updates its email.
                const data = await linkGoogleWithCredentials(email, password, credential)
                setAuth(data.token, data.user)
                const groupId = await consumePendingInvite()
                navigate(groupId ? `/groups/${groupId}/matches` : '/groups')
              }}
            />
            <button type="button" className="auth-link back-link" onClick={() => setUnverified(false)}>
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field">
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label className="field-label">Password</label>
                <input
                  className="field-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'SIGN IN'}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton onError={setError} />

            <p className="auth-switch">
              No account?{' '}
              <Link to="/register" className="auth-link">Create one</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
