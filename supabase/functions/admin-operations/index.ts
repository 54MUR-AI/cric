import { getCorsHeaders } from '../_shared/cors.ts'

interface GoTrueUser {
  id: string
  email?: string
  app_metadata?: Record<string, unknown>
}

interface ProfileRow {
  is_admin?: boolean
}

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

const UA = '(cric.app, denali.2.foxtrot@gmail.com)'

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

    // Verify caller is super admin by checking their JWT
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey, 'User-Agent': UA },
    })
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const user = await userResp.json() as GoTrueUser

    // Check if user has admin role in app_metadata or profiles
    const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=is_admin`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
    })
    const profiles = await profileResp.json() as ProfileRow[]
    const profile = Array.isArray(profiles) ? profiles[0] : null
    const isAdmin = profile?.is_admin || user?.app_metadata?.role === 'super_admin'

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as RequestBody

    switch (body.action) {
      case 'createUser': {
        const { email, password, display_name } = body
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
        await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile_id}`, {
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

        // Update app_metadata via GoTrue admin API
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${profile_id}`, {
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
