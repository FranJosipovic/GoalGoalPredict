import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../hooks/useTheme'

interface Props {
  children: React.ReactNode
  title?: string
  showBack?: boolean
}

export default function Layout({ children, title, showBack }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const { theme, toggle } = useTheme()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          {showBack && (
            <button className="back-btn" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
            </button>
          )}
          {title ? (
            <span className="header-title">{title}</span>
          ) : (
            <span className="logo-text">GG<span className="logo-accent">PREDICT</span></span>
          )}
        </div>
        <div className="header-right">
          {showBack && (
            <button className="theme-toggle-btn" onClick={() => navigate('/groups')} title="Home">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" />
              </svg>
            </button>
          )}
          <button className="theme-toggle-btn" onClick={toggle} title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
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
          </button>
          {user && (
            <>
              <button
                className="user-name"
                onClick={() => navigate('/profile')}
                title="Edit profile"
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0 }}
              >
                {user.firstName}
              </button>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </>
          )}
        </div>
      </header>
      <main className="main-content">{children}</main>

      {/* Bottom nav — only on main pages */}
      {!showBack && user && (
        <nav className="bottom-nav">
          <button
            className={`bottom-nav-item ${location.pathname === '/groups' ? 'bottom-nav-item--active' : ''}`}
            onClick={() => navigate('/groups')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span>Groups</span>
          </button>
          <button
            className={`bottom-nav-item ${location.pathname.startsWith('/tournament') ? 'bottom-nav-item--active' : ''}`}
            onClick={() => navigate('/tournament')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 000 20M2 12h20" />
            </svg>
            <span>Tournament</span>
          </button>
          {user.isAdmin && (
            <button
              className={`bottom-nav-item ${location.pathname.startsWith('/admin') ? 'bottom-nav-item--active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
              </svg>
              <span>Admin</span>
            </button>
          )}
        </nav>
      )}
    </div>
  )
}
