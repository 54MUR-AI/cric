import { getCorsHeaders } from '../_shared/cors.ts'
import { authenticate, UA } from '../_shared/auth.ts'
import webpush from 'npm:web-push@3.6.7'

interface PushPayload {
  title: string
  body?: string
  tag?: string
  icon?: string
  data?: Record<string, unknown>
}

interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const auth = await authenticate(req)
    if (!auth) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (!auth.isAdmin) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const payload: PushPayload = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    // Fetch all subscriptions
    const subsResp = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=id,endpoint,p256dh_key,auth_key`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
    })
    const subs = await subsResp.json()

    if (!Array.isArray(subs) || !subs.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const rows = subs as PushSubscriptionRow[]

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured as secrets')
    }

    webpush.setVapidDetails('mailto:denali.2.foxtrot@gmail.com', vapidPublicKey, vapidPrivateKey)

    const results = await Promise.allSettled(
      rows.map((s: PushSubscriptionRow) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
          JSON.stringify(payload),
          { TTL: 86400, urgency: 'normal' },
        ),
      ),
    )

    const sent = results.filter(r => r.status === 'fulfilled').length

    // Prune dead subscriptions (push services report 404/410 when the
    // subscription no longer exists) so the table doesn't accumulate
    // permanently-failing endpoints.
    const deadIds = results
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => {
        if (r.status !== 'rejected') return false
        const code = (r.reason as any)?.statusCode
        return code === 404 || code === 410
      })
      .map(({ i }) => rows[i].id)

    if (deadIds.length) {
      await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?id=in.(${deadIds.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
      }).catch(() => {})
    }

    return new Response(JSON.stringify({ sent, total: rows.length, pruned: deadIds.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
