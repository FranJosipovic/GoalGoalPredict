import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../hooks/useTheme'
import NotificationToggle from './NotificationToggle'

// Consolidates the per-screen controls (match alerts, theme, profile, logout) into a
// single account dropdown anchored to the top-right of the header.
export default function TopBarMenu() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!user) return null

  const initial = (user.firstName?.[0] ?? '?').toUpperCase()

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const handleLogout = () => {
    setOpen(false)
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="tbm">
      <button
        className="tbm-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account menu"
      >
        {initial}
      </button>

      {open && createPortal(
        <>
          <div className="tbm-backdrop" onClick={() => setOpen(false)} />
          <div className="tbm-panel" role="menu">
            <button className="tbm-profile" onClick={() => go('/profile')} role="menuitem">
              <span className="tbm-avatar">{initial}</span>
              <span className="tbm-profile-text">
                <span className="tbm-name">{user.firstName} {user.lastName}</span>
                <span className="tbm-sub">Edit profile</span>
              </span>
              <svg className="tbm-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <div className="tbm-divider" />

            <div className="tbm-section">
              <NotificationToggle />
            </div>

            <button className="tbm-row" onClick={toggle} role="menuitem">
              <span className="tbm-row-icon">
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </span>
              <span className="tbm-row-label">Theme</span>
              <span className="tbm-row-value">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>

            <div className="tbm-divider" />

            <button className="tbm-row tbm-row--danger" onClick={handleLogout} role="menuitem">
              <span className="tbm-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </span>
              <span className="tbm-row-label">Logout</span>
            </button>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}
