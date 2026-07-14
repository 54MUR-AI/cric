import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'Cache-Control': 'no-cache, no-store' } },
})

// Separate client using implicit flow for password resets triggered by an admin.
// The default PKCE flow stores a code verifier in the caller's localStorage, so if
// an admin resets another user's password, the recipient's browser won't have the
// verifier and the code exchange will fail. Implicit flow passes the tokens via URL
// hash, which any browser can pick up without a stored verifier.
export const supabaseImplicit = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
  global: { headers: { 'Cache-Control': 'no-cache, no-store' } },
})
