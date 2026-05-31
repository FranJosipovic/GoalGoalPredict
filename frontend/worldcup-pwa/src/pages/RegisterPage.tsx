import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      setAuth(data.token, data.user)
      navigate('/groups')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed. Try again.')
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

        <p className="auth-switch">
          Already playing?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
