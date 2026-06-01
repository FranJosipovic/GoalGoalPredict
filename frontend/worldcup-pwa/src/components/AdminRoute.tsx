import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!user?.isAdmin) return <Navigate to="/groups" replace />
  return <>{children}</>
}
