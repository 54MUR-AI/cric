import { useEffect, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const VAPID_PUBLIC_KEY = 'BORjaw6KOI9gqKpMa-AenEu7mSTmpjc6dUNlsFGb20YY53OC7MCqe1Ny1I0JCgXfXGdiu7ZMUTS5TFVYGUkU9ts'

export function usePushNotifications() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const ok = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (ok && user) {
      navigator.serviceWorker.ready.then(async reg => {
        const sub = await reg.pushManager.getSubscription()
        setEnabled(Notification.permission === 'granted' && !!sub)
      }).catch(() => {
        setEnabled(Notification.permission === 'granted')
      })
    }
  }, [user])

  const subscribe = useCallback(async () => {
    if (!user || !supported) return { ok: false, reason: 'unsupported' }

    if (Notification.permission === 'denied') return { ok: false, reason: 'denied' }

    let perm = Notification.permission
    if (perm === 'default') {
      perm = await Notification.requestPermission()
      if (perm !== 'granted') return { ok: false, reason: 'denied' }
    }

    try {
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        })
      }

      await saveSubscription(sub)
      setEnabled(true)
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: err.message }
    }
  }, [user, supported])

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setEnabled(false)
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }, [])

  const toggle = useCallback(async () => {
    if (enabled) return unsubscribe()
    return subscribe()
  }, [enabled, subscribe, unsubscribe])

  return { supported, enabled, subscribe, unsubscribe, toggle }
}

export async function sendPushToAll(payload) {
  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh_key, auth_key')

    if (!subs?.length) return

    const subscriptions = subs.map(s => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh_key, auth: s.auth_key },
    }))

    const functionUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
      || 'https://lncewemrcsfqfzjgrcdu.supabase.co/functions/v1'

    const { data: sessionData } = await supabase.auth.getSession()

    await fetch(`${functionUrl}/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify({ subscriptions, payload }),
    })
  } catch {}
}

async function saveSubscription(sub) {
  const subJSON = sub.toJSON()
  if (!subJSON.endpoint || !subJSON.keys) return

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return

  await supabase.from('push_subscriptions').upsert(
    {
      endpoint: subJSON.endpoint,
      p256dh_key: subJSON.keys.p256dh,
      auth_key: subJSON.keys.auth,
      user_id: userId,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' },
  )
}
