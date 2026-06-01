import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const nav = [
    { label: 'Dashboard', path: '/admin' },
    { label: 'Sim Groups', path: '/admin/groups' },
    { label: 'Sim Matches', path: '/admin/matches' },
  ]

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-gg">GG</span>
          <span className="admin-brand-admin">ADMIN</span>
        </div>
        <nav className="admin-nav">
          {nav.map(n => (
            <Link
              key={n.path}
              to={n.path}
              className={`admin-nav-item ${location.pathname === n.path ? 'admin-nav-item--active' : ''}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user">{user?.firstName} {user?.lastName}</div>
          <button className="admin-logout" onClick={() => { clearAuth(); navigate('/login') }}>Sign out</button>
        </div>
      </aside>
      <main className="admin-main">
        {title && <h1 className="admin-page-title">{title}</h1>}
        {children}
      </main>
    </div>
  )
}
