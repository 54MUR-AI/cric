import { getCorsHeaders } from '../_shared/cors.ts'
import webpush from 'npm:web-push@3.6.7'

interface Subscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface PushPayload {
  title: string
  body?: string
  tag?: string
  icon?: string
  data?: Record<string, unknown>
}

interface SendPushBody {
  payload: PushPayload
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
    if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey, 'User-Agent': UA },
    })
    if (!userResp.ok) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors })
    const user = await userResp.json()
    const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=is_admin`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
    })
    const profiles = await profileResp.json()
    const profile = Array.isArray(profiles) ? profiles[0] : null
    const isAdmin = profile?.is_admin || user?.app_metadata?.role === 'super_admin'
    if (!isAdmin) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: cors })

    const { payload }: SendPushBody = await req.json()

    const subsResp = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=endpoint,p256dh_key,auth_key`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
    })
    const subs = await subsResp.json()
    const subscriptions: Subscription[] = Array.isArray(subs) ? subs.map((s: any) => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh_key, auth: s.auth_key },
    })) : []

    if (!subscriptions.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured as secrets')
    }

    webpush.setVapidDetails('mailto:denali.2.foxtrot@gmail.com', vapidPublicKey, vapidPrivateKey)

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          JSON.stringify(payload),
          { TTL: 86400, urgency: 'normal' },
        )
      ),
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
