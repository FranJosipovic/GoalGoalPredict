import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, resendVerification } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function RegisterPage() {
  const navigate = useNavigate()

  // Already authenticated (e.g. navigated back here)? Send them home instead of
  // showing a registration form that looks like they were logged out.
  useEffect(() => {
    if (useAuthStore.getState().token) navigate('/groups', { replace: true })
  }, [navigate])

  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Once registration succeeds we swap the form for a "check your email" panel.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const data = await register(form)
      setRegisteredEmail(data.email)
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!registeredEmail) return
    try {
      await resendVerification(registeredEmail)
    } finally {
      setResent(true)
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

        {registeredEmail ? (
          <div className="verify-prompt">
            <div className="verify-icon">📧</div>
            <p className="verify-title">Check your email</p>
            <p className="verify-text">
              We sent a verification link to <strong>{registeredEmail}</strong>. Click it to
              activate your account, then sign in.
            </p>
            {resent ? (
              <p className="verify-sent">✓ Sent again. Give it a minute to arrive.</p>
            ) : (
              <button type="button" className="btn-secondary" onClick={handleResend}>
                Resend email
              </button>
            )}
            <Link to="/login" className="auth-link back-link">← Back to sign in</Link>
          </div>
        ) : (
          <>
            <h2 className="auth-heading">Join the game</h2>
            <p className="auth-sub">Create your account</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field-row">
                <div className="field">
                  <label className="field-label">First name</label>
                  <input
                    className="field-input"
                    type="text"
                    value={form.firstName}
                    onChange={set('firstName')}
                    placeholder="Luka"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Last name</label>
                  <input
                    className="field-input"
                    type="text"
                    value={form.lastName}
                    onChange={set('lastName')}
                    placeholder="Modrić"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Email</label>
                <input
                  className="field-input"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
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
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>
            <GoogleSignInButton onError={setError} />

            <p className="auth-switch">
              Already playing?{' '}
              <Link to="/login" className="auth-link">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
