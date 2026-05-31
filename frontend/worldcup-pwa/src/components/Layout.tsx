import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: React.ReactNode
  title?: string
  showBack?: boolean
}

export default function Layout({ children, title, showBack }: Props) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

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
          {user && (
            <>
              <span className="user-name">{user.firstName}</span>
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
    </div>
  )
}
