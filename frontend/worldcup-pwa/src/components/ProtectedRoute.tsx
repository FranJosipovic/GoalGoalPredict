import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getMe } from '../api/auth'

interface Props {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)

  // Refresh user (keeps isAdmin and profile in sync) on mount
  useEffect(() => {
    if (!token) return
    getMe().then(setUser).catch(() => {})
  }, [token, setUser])

  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
