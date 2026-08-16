import { getCorsHeaders } from '../_shared/cors.ts'
import { authenticate, UA } from '../_shared/auth.ts'

interface CreateUserInput {
  email: string
  password: string
  display_name: string
}

interface SetAdminInput {
  profile_id: string
  grant: boolean
}

interface DeleteUserInput {
  user_id: string
}

type RequestBody =
  | ({ action: 'createUser' } & CreateUserInput)
  | ({ action: 'setAdmin' } & SetAdminInput)
  | ({ action: 'deleteUser' } & DeleteUserInput)

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const body = await req.json() as RequestBody

    switch (body.action) {
      case 'createUser': {
        const { email, password, display_name } = body
        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'email and password are required' }), {
            status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
          })
        }
        const createResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'User-Agent': UA,
          },
          body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: { display_name: display_name || email.split('@')[0] },
          }),
        })
        const result = await createResp.json()
        if (!createResp.ok) throw new Error(result.msg || result.message || 'createUser failed')
        return new Response(JSON.stringify({ user: { id: result.id } }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      case 'setAdmin': {
        const { profile_id, grant } = body

        // Update profiles table
        const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'User-Agent': UA,
          },
          body: JSON.stringify({
            is_admin: grant,
            role: grant ? 'super_admin' : 'member',
          }),
        })
        if (!profileResp.ok) {
          throw new Error(`profile update failed: ${profileResp.status}`)
        }

        // Update app_metadata via GoTrue admin API
        const metaResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${profile_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'User-Agent': UA,
          },
          body: JSON.stringify({
            app_metadata: { role: grant ? 'super_admin' : 'member' },
          }),
        })
        if (!metaResp.ok) {
          // Roll back the profiles update so the two sources don't drift
          await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile_id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'User-Agent': UA,
            },
            body: JSON.stringify({
              is_admin: !grant,
              role: grant ? 'member' : 'super_admin',
            }),
          }).catch(() => {})
          throw new Error(`app_metadata update failed: ${metaResp.status}`)
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      case 'deleteUser': {
        const { user_id } = body
        const deleteResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
          method: 'DELETE',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'User-Agent': UA,
          },
        })
        if (!deleteResp.ok) {
          const result = await deleteResp.json().catch(() => ({}))
          throw new Error(result.msg || result.message || 'deleteUser failed')
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'unknown action' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
