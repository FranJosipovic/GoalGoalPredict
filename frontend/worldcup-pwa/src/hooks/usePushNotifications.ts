import { useState, useEffect, useCallback } from 'react'
import { getVapidPublicKey, subscribePush, unsubscribePush } from '../api/push'

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
  const [status, setStatus] = useState<PushStatus>(supported ? Notification.permission : 'unsupported')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supported) return
    // Sync existing subscription state on mount
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setStatus('granted')
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
      if (sub) {
        await unsubscribePush(sub.endpoint)
        await sub.unsubscribe()
      }
      setStatus('default')
    } finally {
      setBusy(false)
    }
  }, [supported])

  return { supported, status, busy, enable, disable }
}
