import { getCorsHeaders } from '../_shared/cors.ts'
import { authenticate, UA } from '../_shared/auth.ts'
import { sendEmail, shouldSendEmail } from '../_shared/resend.ts'
import webpush from 'npm:web-push@3.6.7'

interface SubRow {
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

    const { booking_id } = await req.json()
    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'booking_id required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'User-Agent': UA,
      'Content-Type': 'application/json',
    }

    const bookingResp = await fetch(
      `${supabaseUrl}/rest/v1/bookings?select=id,user_id,cabins(booking_authority_id,name),guests,start_date,end_date&id=eq.${booking_id}`,
      { headers },
    )
    const rows = await bookingResp.json()
    const booking = Array.isArray(rows) ? rows[0] : null

    const authorityId = booking?.cabins?.booking_authority_id
    if (!booking || !authorityId) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_authority' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const cabinName = booking.cabins.name || 'Cabin'
    const requesterResp = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${booking.user_id}&select=display_name`,
      { headers },
    )
    const reqRows = await requesterResp.json()
    const requesterName = (Array.isArray(reqRows) && reqRows[0]?.display_name) || 'a member'

    const subsResp = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?select=id,endpoint,p256dh_key,auth_key&user_id=eq.${authorityId}`,
      { headers },
    )
    const subs: SubRow[] = await subsResp.json().catch(() => [])
    if (!Array.isArray(subs) || !subs.length) {
      return new Response(JSON.stringify({ sent: 0, total: 0 }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured as secrets')
    }
    webpush.setVapidDetails('mailto:denali.2.foxtrot@gmail.com', vapidPublicKey, vapidPrivateKey)

    const start = (booking.start_date || '').slice(5)
    const end = (booking.end_date || '').slice(5)
    const payload = {
      title: `New booking request: ${cabinName}`,
      body: `${booking.guests || 'Booking'} · ${start}–${end} · by ${requesterName}`,
      tag: `booking-${booking_id}`,
      icon: '/icons/icon-192x192.png',
      data: { url: '/schedule' },
    }

    const results = await Promise.allSettled(
      subs.map((s: SubRow) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
          JSON.stringify(payload),
          { TTL: 86400, urgency: 'normal' },
        ),
      ),
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const deadIds = results
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => {
        if (r.status !== 'rejected') return false
        const code = (r.reason as any)?.statusCode
        return code === 404 || code === 410
      })
      .map(({ i }) => subs[i].id)

    if (deadIds.length) {
      await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?id=in.(${deadIds.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
      }).catch(() => {})
    }

    const { email, enabled } = await shouldSendEmail(supabaseUrl, serviceKey, authorityId, UA)
    let emailSent = false
    if (enabled && email) {
      emailSent = await sendEmail(
        email,
        `New booking request: ${cabinName}`,
        `<p><strong>${requesterName}</strong> requested <strong>${cabinName}</strong></p>
         <p>${booking.guests || 'Booking'} &middot; ${start}–${end}</p>
         <p><a href="https://chairrock.app/schedule">Review booking</a></p>`,
      )
    }

    return new Response(JSON.stringify({ sent, total: subs.length, email_sent: emailSent }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
