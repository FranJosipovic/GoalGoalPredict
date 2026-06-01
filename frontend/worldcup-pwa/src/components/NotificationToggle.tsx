import { usePushNotifications } from '../hooks/usePushNotifications'

export default function NotificationToggle() {
  const { supported, status, busy, enable, disable } = usePushNotifications()

  if (!supported) return null
  if (status === 'denied') {
    return (
      <div className="notif-toggle notif-toggle--denied">
        <span className="notif-icon">🔕</span>
        <span className="notif-text">Notifications blocked in browser settings</span>
      </div>
    )
  }

  const enabled = status === 'granted'

  return (
    <button
      className={`notif-toggle ${enabled ? 'notif-toggle--on' : ''}`}
      onClick={() => (enabled ? disable() : enable())}
      disabled={busy}
    >
      <span className="notif-icon">{enabled ? '🔔' : '🔕'}</span>
      <span className="notif-text">
        {busy ? 'Working…' : enabled ? 'Match alerts on' : 'Enable match alerts'}
      </span>
      <span className={`notif-switch ${enabled ? 'notif-switch--on' : ''}`}>
        <span className="notif-switch-knob" />
      </span>
    </button>
  )
}
