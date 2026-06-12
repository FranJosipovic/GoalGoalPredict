import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import TopBarMenu from './TopBarMenu'

interface Props {
  children: React.ReactNode
  title?: string
  showBack?: boolean
}

export default function Layout({ children, title, showBack }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()

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
          {user && <TopBarMenu />}
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
