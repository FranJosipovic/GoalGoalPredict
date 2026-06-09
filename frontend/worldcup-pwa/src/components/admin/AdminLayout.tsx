import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const nav = [
    { label: 'Dashboard', path: '/admin' },
    { label: 'Sync & Compare', path: '/admin/sync' },
    { label: 'Users', path: '/admin/users' },
    { label: 'Groups', path: '/admin/all-groups' },
    { label: 'Sim Groups', path: '/admin/groups' },
    { label: 'Sim Matches', path: '/admin/matches' },
  ]

  const isActive = (path: string) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path)

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-gg">GG</span>
          <span className="admin-brand-admin">ADMIN</span>
        </div>
        <Link to="/groups" className="admin-back-app">← Back to app</Link>
        <nav className="admin-nav">
          {nav.map(n => (
            <Link
              key={n.path}
              to={n.path}
              className={`admin-nav-item ${isActive(n.path) ? 'admin-nav-item--active' : ''}`}
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
