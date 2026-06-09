import { useState, useEffect, useCallback } from 'react'
import { getVapidPublicKey, subscribePush, unsubscribeAllPush } from '../api/push'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function bufToBase64(buf: ArrayBuffer | null) {
  if (!buf) return ''
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

export type PushStatus = 'unsupported' | 'denied' | 'default' | 'granted'

export function usePushNotifications() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  // "granted" tracks an active push subscription, not the browser permission —
  // permission stays granted after unsubscribing, so we must not derive it from that.
  const [status, setStatus] = useState<PushStatus>(
    !supported ? 'unsupported' : Notification.permission === 'denied' ? 'denied' : 'default'
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supported) return
    // Reflect actual subscription presence on mount
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setStatus('granted')
        else setStatus(Notification.permission === 'denied' ? 'denied' : 'default')
      })
    ).catch(() => {})
  }, [supported])

  const enable = useCallback(async () => {
    if (!supported) return false
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      setStatus(permission as PushStatus)
      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready
      const publicKey = await getVapidPublicKey()
      if (!publicKey) return false

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const json = sub.toJSON()
      await subscribePush({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? bufToBase64(sub.getKey('p256dh')),
        auth: json.keys?.auth ?? bufToBase64(sub.getKey('auth')),
      })
      return true
    } catch {
      return false
    } finally {
      setBusy(false)
    }
  }, [supported])

  const disable = useCallback(async () => {
    if (!supported) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      // Clear all server-side subscriptions for this account (other devices / stale rows)
      await unsubscribeAllPush()
      setStatus('default')
    } finally {
      setBusy(false)
    }
  }, [supported])

  return { supported, status, busy, enable, disable }
}
