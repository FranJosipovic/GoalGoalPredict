import { joinGroup } from '../api/groups'

const KEY = 'pendingInvite'

export const setPendingInvite = (code: string) => localStorage.setItem(KEY, code)
export const getPendingInvite = () => localStorage.getItem(KEY)
export const clearPendingInvite = () => localStorage.removeItem(KEY)

/**
 * After a successful login/register, redeem a stored invite code (if any).
 * Returns the group id to navigate to, or null if there was no pending invite.
 * Swallows "already a member" / invalid-code errors so auth never gets blocked.
 */
export async function consumePendingInvite(): Promise<string | null> {
  const code = getPendingInvite()
  if (!code) return null
  clearPendingInvite()
  try {
    const group = await joinGroup(code.toUpperCase())
    return group.id
  } catch {
    // Already a member, or the code became invalid — fall back to normal flow.
    return null
  }
}
