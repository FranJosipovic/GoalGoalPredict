import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { googleSignIn } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { consumePendingInvite } from '../lib/invite'

interface Props {
  onError?: (msg: string) => void
  /**
   * Override what happens with the Google credential. When provided, the button hands
   * over the raw credential and the parent decides (e.g. link to an existing account).
   * When omitted, it performs the default public sign-in / sign-up.
   */
  onCredential?: (credential: string) => Promise<void> | void
}

/**
 * Renders Google's "Sign in with Google" button. By default it exchanges the Google
 * credential for our own JWT (sign-in or auto-provision), stores the session and routes
 * home. Pass `onCredential` to intercept the credential instead (used for account linking).
 */
export default function GoogleSignInButton({ onError, onCredential }: Props) {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  // No client id configured → don't render a broken button.
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null

  return (
    <div className="google-btn-wrap">
      <GoogleLogin
        theme="filled_black"
        shape="pill"
        text="continue_with"
        onSuccess={async (resp) => {
          try {
            if (!resp.credential) throw new Error('No credential')
            if (onCredential) {
              await onCredential(resp.credential)
              return
            }
            const data = await googleSignIn(resp.credential)
            setAuth(data.token, data.user)
            const groupId = await consumePendingInvite()
            navigate(groupId ? `/groups/${groupId}/matches` : '/groups')
          } catch (err: any) {
            onError?.(err.response?.data?.error ?? 'Google sign-in failed. Try again.')
          }
        }}
        onError={() => onError?.('Google sign-in failed. Try again.')}
      />
    </div>
  )
}
