const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM = 'CRIC Manager <noreply@chairrock.app>'

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function shouldSendEmail(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  UA: string,
): Promise<{ email: string | null; enabled: boolean }> {
  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=email,email_notifications`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA } },
    )
    const rows = await resp.json()
    const profile = Array.isArray(rows) ? rows[0] : null
    if (!profile?.email || profile.email_notifications === false) {
      return { email: null, enabled: false }
    }
    return { email: profile.email, enabled: true }
  } catch {
    return { email: null, enabled: false }
  }
}
