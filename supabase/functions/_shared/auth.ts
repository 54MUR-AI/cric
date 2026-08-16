// Shared auth helpers for Edge Functions. Keeps the admin check in one place so
// every function uses the same definition of who is an admin.
export const UA = Deno.env.get('APP_USER_AGENT') || '(cric.app)'

export interface AuthUser {
  id: string
  email?: string
  app_metadata?: Record<string, unknown>
}

export interface AuthResult {
  user: AuthUser
  isAdmin: boolean
}

// Validates the caller's bearer token against Supabase Auth and resolves whether
// they hold admin privileges (profiles.is_admin OR JWT app_metadata.role).
// Returns null when unauthenticated.
export async function authenticate(req: Request): Promise<AuthResult | null> {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return null

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey, 'User-Agent': UA },
  })
  if (!userResp.ok) return null
  const user: AuthUser = await userResp.json()
  if (!user?.id) return null

  const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=is_admin`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'User-Agent': UA },
  })
  const profiles = await profileResp.json()
  const profile = Array.isArray(profiles) ? profiles[0] : null

  return {
    user,
    isAdmin: Boolean(profile?.is_admin) || user?.app_metadata?.role === 'super_admin',
  }
}
