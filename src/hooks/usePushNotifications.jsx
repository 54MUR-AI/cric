import { useEffect, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const VAPID_PUBLIC_KEY = 'BNVy6avXiwCH62TDZqHCi11KaFll6AGVXyyuzVmMx18eHsAyDgzG0_Kxck4M3ixkUxSngN9XvejDd6hb9yIvF7o'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

const VAPID_KEY_BYTES = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

function isBrave() {
  return navigator.brave && typeof navigator.brave.isBrave === 'function'
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [isBraveBrowser, setIsBraveBrowser] = useState(false)

  // Check subscription status on mount and when user changes
  useEffect(() => {
    const hasAPI = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(hasAPI)
    setIsBraveBrowser(isBrave())
    
    if (hasAPI && user) {
      checkSubscriptionStatus()
    }
  }, [user])

  const checkSubscriptionStatus = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const perm = Notification.permission
      setEnabled(perm === 'granted' && !!sub)
    } catch {
      setEnabled(Notification.permission === 'granted')
    }
  }

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
      
      // Check if already subscribed
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await saveSubscription(existing)
        setEnabled(true)
        return { ok: true }
      }

      // Subscribe fresh
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_KEY_BYTES,
      })

      await saveSubscription(sub)
      setEnabled(true)
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: `${err.name}: ${err.message}` }
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

  return { supported, enabled, isBraveBrowser, subscribe, unsubscribe, toggle }
}

export async function sendPushToAll(payload) {
  try {
    const functionUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
      || 'https://lncewemrcsfqfzjgrcdu.supabase.co/functions/v1'

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return

    await fetch(`${functionUrl}/trigger-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
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
