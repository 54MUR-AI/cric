// One-off member notice: ask every CRIC member to reset their password.
// Deploy with verify_jwt = false; access is gated by the RESET_NOTICE_SECRET header below.
// POST { "mode": "initial" | "reminder", "dry_run"?: boolean }
// Header: x-reset-notice-secret: <RESET_NOTICE_SECRET>
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildEmail } from './content.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const NOTICE_SECRET = Deno.env.get('RESET_NOTICE_SECRET') ?? ''
const FROM = 'CRIC <noreply@chairrock.app>'
const REPLY_TO = 'denali.2.foxtrot@gmail.com'
const SPACING_MS = 600

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!NOTICE_SECRET || !safeEqual(req.headers.get('x-reset-notice-secret') ?? '', NOTICE_SECRET)) {
    return json({ error: 'unauthorized' }, 401)
  }
  // Tolerant body parsing: raw text -> JSON (parse twice if double-encoded), plus ?mode=&dry_run= query params.
  const url = new URL(req.url)
  const raw = await req.text().catch(() => '')
  let body: { mode?: string; dry_run?: unknown } = {}
  if (raw.trim()) {
    try {
      let parsed: unknown = JSON.parse(raw)
      if (typeof parsed === 'string') parsed = JSON.parse(parsed)
      if (parsed && typeof parsed === 'object') body = parsed as typeof body
      else throw new Error('not an object')
    } catch {
      return json({ error: 'bad json', content_type: req.headers.get('content-type'), body_length: raw.length, body_preview: raw.slice(0, 120) }, 400)
    }
  }
  if (body.mode === undefined && url.searchParams.has('mode')) body.mode = url.searchParams.get('mode') ?? undefined
  if (body.dry_run === undefined && url.searchParams.has('dry_run')) body.dry_run = url.searchParams.get('dry_run') === 'true'
  const mode = body.mode
  if (mode !== 'initial' && mode !== 'reminder') return json({ error: "mode must be 'initial' or 'reminder'" }, 400)
  const dryRun = body.dry_run === true

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  // All confirmed, non-banned users
  const users: { id: string; email: string }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return json({ error: 'listUsers failed', detail: error.message }, 500)
    for (const u of data.users) {
      const banned = u.banned_until && new Date(u.banned_until) > new Date()
      if (u.email && u.email_confirmed_at && !banned) users.push({ id: u.id, email: u.email })
    }
    if (data.users.length < 200) break
  }

  const { data: logRows, error: logErr } = await db.from('reset_notice_sends').select('user_id, kind, status, sent_at')
  if (logErr) return json({ error: 'log read failed', detail: logErr.message }, 500)
  const done = new Set(logRows.filter((r) => r.kind === mode && r.status === 'sent').map((r) => r.user_id))

  let recipients = users.filter((u) => !done.has(u.id))
  let skippedAlreadyReset = 0
  if (mode === 'reminder') {
    const initialAt = new Map(
      logRows.filter((r) => r.kind === 'initial' && r.status === 'sent').map((r) => [r.user_id, r.sent_at as string]),
    )
    const { data: changes, error: chErr } = await db.from('password_changes').select('user_id, changed_at')
    if (chErr) return json({ error: 'password_changes read failed', detail: chErr.message }, 500)
    const reset = new Set(
      changes.filter((c) => initialAt.has(c.user_id) && c.changed_at > initialAt.get(c.user_id)!).map((c) => c.user_id),
    )
    // Only remind people who got the initial notice and haven't changed their password since.
    recipients = recipients.filter((u) => initialAt.has(u.id) && !reset.has(u.id))
    skippedAlreadyReset = reset.size
  }

  if (dryRun) {
    return json({ mode, dry_run: true, confirmed_users: users.length, already_sent: done.size, skipped_already_reset: skippedAlreadyReset, would_send: recipients.length })
  }
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not set' }, 500)

  const email = buildEmail(mode)
  let sent = 0, failed = 0, skipped = 0
  for (const u of recipients) {
    // Claim first so a concurrent/rerun invocation can't double-send.
    const { data: claimed } = await db.from('reset_notice_sends')
      .insert({ user_id: u.id, kind: mode, status: 'sending', email: u.email })
      .select('id').maybeSingle()
    let ok = !!claimed
    if (!ok) {
      // Row exists: only retry if a previous attempt failed.
      const { data: retry } = await db.from('reset_notice_sends')
        .update({ status: 'sending', error: null })
        .eq('user_id', u.id).eq('kind', mode).eq('status', 'failed')
        .select('id').maybeSingle()
      ok = !!retry
    }
    if (!ok) { skipped++; continue }

    let status = 'failed', resendId: string | null = null, errText: string | null = null
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM, to: [u.email], reply_to: REPLY_TO,
          subject: email.subject, html: email.html, text: email.text,
        }),
      })
      const out = await res.json().catch(() => ({}))
      if (res.ok) { status = 'sent'; resendId = out.id ?? null } else errText = `${res.status} ${JSON.stringify(out)}`.slice(0, 500)
    } catch (e) { errText = String(e).slice(0, 500) }

    await db.from('reset_notice_sends')
      .update({ status, resend_id: resendId, error: errText, sent_at: status === 'sent' ? new Date().toISOString() : null })
      .eq('user_id', u.id).eq('kind', mode)
    status === 'sent' ? sent++ : failed++
    await new Promise((r) => setTimeout(r, SPACING_MS))
  }
  return json({ mode, sent, failed, skipped, attempted: recipients.length })
})
