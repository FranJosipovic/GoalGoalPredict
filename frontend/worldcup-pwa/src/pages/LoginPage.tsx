import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login({ email, password })
      setAuth(data.token, data.user)
      navigate('/groups')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
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

        <p className="auth-switch">
          No account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  )
}
