import { getCorsHeaders } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface CreateUserInput {
  email: string
  password: string
  display_name: string
}

interface SetAdminInput {
  profile_id: string
  grant: boolean
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

    const { action, ...input } = await req.json()

    switch (action) {
      case 'createUser': {
        const { email, password, display_name } = input as CreateUserInput
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: display_name || email.split('@')[0] },
        })
        if (error) throw error
        return new Response(JSON.stringify({ user: data.user }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      case 'setAdmin': {
        const { profile_id, grant } = input as SetAdminInput
        await supabase
          .from('profiles')
          .update({ is_admin: grant, role: grant ? 'super_admin' : 'member' })
          .eq('id', profile_id)

        await supabase.auth.admin.updateUserById(profile_id, {
          app_metadata: { role: grant ? 'super_admin' : 'member' },
        })

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
