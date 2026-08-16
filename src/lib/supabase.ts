import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'Cache-Control': 'no-cache, no-store' } },
})

// Password-recovery links are generated with the implicit flow so the reset URL
// carries tokens in the hash (#access_token=...&type=recovery) instead of a PKCE
// ?code=... that can only be exchanged in the browser that triggered the reset.
// This keeps resets working when the link is opened on another device/browser.
export const supabaseImplicit = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
  global: { headers: { 'Cache-Control': 'no-cache, no-store' } },
})

export const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  || `${supabaseUrl}/functions/v1`

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
