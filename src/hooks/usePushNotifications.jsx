import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const VAPID_PUBLIC_KEY = 'c9f8829a1866c6cd5bfa21222828192db89c01298ff648563318d743f56b1616'

export function usePushNotifications() {
  const { user } = useAuth()
  const subscribedRef = useRef(false)

  const getSubscription = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      return reg.pushManager.getSubscription()
    } catch { return null }
  }, [])

  const subscribe = useCallback(async () => {
    if (!user || !('Notification' in window) || !('serviceWorker' in navigator)) return

    const permission = Notification.permission
    if (permission === 'denied') return

    if (permission === 'default') {
      const result = await Notification.requestPermission()
      if (result !== 'granted') return
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await saveSubscription(existing)
        subscribedRef.current = true
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      })

      await saveSubscription(sub)
      subscribedRef.current = true
    } catch {}
  }, [user])

  const unsubscribe = useCallback(async () => {
    try {
      const sub = await getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      subscribedRef.current = false
    } catch {}
  }, [getSubscription])

  useEffect(() => {
    if (!user) {
      subscribedRef.current = false
      return
    }

    const init = async () => {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await saveSubscription(existing)
        subscribedRef.current = true
      }
    }

    init()

    const handleOnline = () => {
      if (!subscribedRef.current) init()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [user])

  return { subscribe, unsubscribe, getSubscription, sendPushToAll }
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
