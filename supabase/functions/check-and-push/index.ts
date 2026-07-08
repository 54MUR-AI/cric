import { getCorsHeaders } from '../_shared/cors.ts'
import webpush from 'npm:web-push@3.6.7'

const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?point=44.14722,-74.81194'
const NWS_UA = '(cric.app, denali.2.foxtrot@gmail.com)'
const UA = '(cric.app, denali.2.foxtrot@gmail.com)'

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

interface NwsProperties {
  id: string
  event?: string
  headline?: string
  description?: string
  severity?: string
  urgency?: string
}

interface NwsFeature {
  properties: NwsProperties
}

interface NwsResponse {
  features?: NwsFeature[]
}

interface SubscriptionRow {
  endpoint: string
  p256dh_key: string
  auth_key: string
}

interface SentAlert {
  alert_id: string
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  const authHeader = req.headers.get('authorization') || ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors })
  }

  try {
    const results = await Promise.allSettled([
      checkNwsAlerts(),
      checkRecentActivity(),
    ])

    const summary = results.map((r, i) => {
      const label = ['nws', 'activity'][i]
      return r.status === 'fulfilled' ? `${label}:ok` : `${label}:${(r.reason as Error)?.message || 'error'}`
    })

    return new Response(JSON.stringify({ status: 'done', summary }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

async function checkNwsAlerts(): Promise<void> {
  const r = await fetch(NWS_ALERTS_URL, { headers: { 'User-Agent': NWS_UA } })
  const data: NwsResponse = await r.json()
  const features = (data.features || []).filter((f: NwsFeature) => {
    const e = f.properties.event || ''
    return e.includes('Warning') || e.includes('Watch') || e === 'Severe Thunderstorm' || e.includes('Small Craft') || e.includes('Marine')
  })

  if (!features.length) return

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  const existingResp = await fetch(`${supabaseUrl}/rest/v1/sent_nws_alerts?select=alert_id`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  const existing: SentAlert[] = await existingResp.json().catch(() => [])

  const existingIds = new Set((existing || []).map((r: SentAlert) => r.alert_id))
  const newFeatures = features.filter((f: NwsFeature) => !existingIds.has(f.properties.id))

  if (!newFeatures.length) return

  const subs = await getSubscriptions(serviceKey, supabaseUrl)
  if (!subs.length) return

  for (const f of newFeatures) {
    const p = f.properties
    const payload: PushPayload = {
      title: p.event || 'Weather Alert',
      body: (p.headline || p.description || '').slice(0, 120),
      tag: `nws-${p.id}`,
      icon: '/icons/icon-192x192.png',
      data: { url: '/' },
    }
    await sendPush(subs, payload)

    await fetch(`${supabaseUrl}/rest/v1/sent_nws_alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ alert_id: p.id, event: p.event }),
    })
  }
}

async function checkRecentActivity(): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const [bookings, tasks, trips] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/bookings?select=id,cabins!inner(name),start_date,end_date&created_at=gt.${cutoff}&order=created_at.desc`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).then(r => r.json()),
    fetch(`${supabaseUrl}/rest/v1/maintenance_tasks?select=id,title&created_at=gt.${cutoff}&order=created_at.desc`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).then(r => r.json()),
    fetch(`${supabaseUrl}/rest/v1/boat_trips?select=id,destination,trip_date&created_at=gt.${cutoff}&order=created_at.desc`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    }).then(r => r.json()),
  ])

  const items: string[] = []
  ;(bookings || []).forEach((b: any) => items.push(`${b.cabins?.name || 'Cabin'} booked ${(b.start_date || '').slice(5)}`))
  ;(tasks || []).forEach((t: any) => items.push(`Task: ${t.title}`))
  ;(trips || []).forEach((t: any) => items.push(`Boat trip: ${t.destination} on ${(t.trip_date || '').slice(5)}`))

  if (!items.length) return

  const subs = await getSubscriptions(serviceKey, supabaseUrl)
  if (!subs.length) return

  await sendPush(subs, {
    title: 'CRIC Manager',
    body: items.slice(0, 3).join('\n') + (items.length > 3 ? `\n+${items.length - 3} more` : ''),
    tag: 'cric-activity',
    icon: '/icons/icon-192x192.png',
    data: { url: '/' },
  })
}

async function getSubscriptions(serviceKey: string, supabaseUrl: string): Promise<Subscription[]> {
  const resp = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=endpoint,p256dh_key,auth_key`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  const rows: SubscriptionRow[] = await resp.json().catch(() => [])
  return (rows || []).map((s: SubscriptionRow) => ({
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh_key, auth: s.auth_key },
  }))
}

async function sendPush(subscriptions: Subscription[], payload: PushPayload): Promise<void> {
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  if (!vapidPrivateKey || !vapidPublicKey) return

  webpush.setVapidDetails('mailto:denali.2.foxtrot@gmail.com', vapidPublicKey, vapidPrivateKey)

  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        JSON.stringify(payload),
        { TTL: 86400, urgency: 'normal' },
      )
    ),
  )
}
