import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getMe } from '../api/auth'
import { applyAccountLanguage } from '../i18n'

interface Props {
  children: React.ReactNode
  // The onboarding page itself sets this so it isn't redirected back to itself.
  allowOnboarding?: boolean
}

export default function ProtectedRoute({ children, allowOnboarding = false }: Props) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  // Refresh user (keeps isAdmin, onboarding + profile in sync) on mount
  useEffect(() => {
    if (!token) return
    getMe()
      .then((u) => {
        setUser(u)
        applyAccountLanguage(u.preferredLanguage)
      })
      .catch(() => {})
  }, [token, setUser])

  if (!token) return <Navigate to="/login" replace />
  // Gate the app behind onboarding. `=== false` (not just falsy) so a stale
  // localStorage user without the field doesn't bounce before getMe resolves.
  if (!allowOnboarding && user?.hasOnboarded === false) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
