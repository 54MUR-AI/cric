import { getCorsHeaders } from '../_shared/cors.ts'
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface PushPayload {
  title: string
  body?: string
  tag?: string
  icon?: string
  data?: Record<string, unknown>
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller is super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const payload: PushPayload = await req.json()

    // Fetch all subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh_key, auth_key')

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const subscriptions = subs.map(s => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh_key, auth: s.auth_key },
    }))

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured as secrets')
    }

    webpush.setVapidDetails('mailto:denali.2.foxtrot@gmail.com', vapidPublicKey, vapidPrivateKey)

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          JSON.stringify(payload),
          { TTL: 86400, urgency: 'normal' },
        ),
      ),
    )

    const sent = results.filter(r => r.status === 'fulfilled').length

    return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
