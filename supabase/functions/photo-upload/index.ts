import { getCorsHeaders } from '../_shared/cors.ts'

const UA = '(cric.app, denali.2.foxtrot@gmail.com)'

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

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
    if (!user?.id) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors })

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'no file' }), { status: 400, headers: cors })
    }

    const piUrl = Deno.env.get('PI_PHOTO_SERVER_URL')
    const piKey = Deno.env.get('PI_PHOTO_SERVER_KEY')

    // Primary: Pi photo server (via Cloudflare Tunnel)
    if (piUrl && piKey) {
      try {
        const piForm = new FormData()
        piForm.append('file', file)
        const piResp = await fetch(`${piUrl}/upload`, {
          method: 'POST',
          headers: { 'X-API-Key': piKey },
          body: piForm,
        })
        if (piResp.ok) {
          const result = await piResp.json()
          return new Response(JSON.stringify({
            storage_path: `photos/${result.storage_path}`,
            url: `${piUrl}/photos/${result.storage_path}`,
            backend: 'pi',
          }), { headers: { ...cors, 'Content-Type': 'application/json' } })
        }
      } catch {
        // fall through to Supabase Storage
      }
    }

    // Fallback: Supabase Storage
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const objectPath = `photos/${crypto.randomUUID()}.${ext}`
    const buf = await file.arrayBuffer()
    const upResp = await fetch(`${supabaseUrl}/storage/v1/object/photos/${objectPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'User-Agent': UA,
      },
      body: buf,
    })
    if (!upResp.ok) {
      const errText = await upResp.text()
      throw new Error(`Storage upload failed: ${upResp.status} ${errText}`)
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/photos/${objectPath}`
    return new Response(JSON.stringify({
      storage_path: objectPath,
      url: publicUrl,
      backend: 'supabase',
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
