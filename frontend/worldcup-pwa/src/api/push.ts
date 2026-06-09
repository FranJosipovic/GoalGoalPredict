import client from './client'

export const getVapidPublicKey = () =>
  client.get<{ publicKey: string }>('/push/vapid-public-key').then(r => r.data.publicKey)

export const subscribePush = (sub: { endpoint: string; p256dh: string; auth: string }) =>
  client.post('/push/subscribe', sub).then(r => r.data)

export const unsubscribePush = (endpoint: string) =>
  client.delete('/push/subscribe', { data: { endpoint } }).then(r => r.data)

export const unsubscribeAllPush = () =>
  client.delete('/push/all').then(r => r.data)
