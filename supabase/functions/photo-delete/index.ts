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

    const { photoId, storagePath } = await req.json()

    // Look up the photo and verify ownership server-side
    const photoResp = await fetch(`${supabaseUrl}/rest/v1/photos?id=eq.${photoId}&select=id,uploaded_by,storage_path,url`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
    })
    const photos = await photoResp.json()
    const photo = Array.isArray(photos) ? photos[0] : null
    if (!photo) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: cors })

    const isOwner = photo.uploaded_by === user.id
    const isAdmin = user.app_metadata?.role === 'super_admin'
    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: cors })
    }

    const piUrl = Deno.env.get('PI_PHOTO_SERVER_URL')
    const piKey = Deno.env.get('PI_PHOTO_SERVER_KEY')

    // Delete the stored file
    if (piUrl && piKey && photo.url?.includes(piUrl) && photo.storage_path) {
      try {
        await fetch(`${piUrl}/photos/${photo.storage_path}`, {
          method: 'DELETE',
          headers: { 'X-API-Key': piKey },
        })
      } catch {
        // best effort — DB row still removed below
      }
    } else if (photo.storage_path) {
      await fetch(`${supabaseUrl}/storage/v1/object/${photo.storage_path}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
      }).catch(() => {})
    }

    // Delete the DB row
    await fetch(`${supabaseUrl}/rest/v1/photos?id=eq.${photoId}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
