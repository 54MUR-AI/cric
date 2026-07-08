import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

function mergeHeaders(a: HeadersInit | undefined, b: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (a) { const h = a instanceof Headers ? Object.fromEntries(a.entries()) : Array.isArray(a) ? Object.fromEntries(a) : a; Object.assign(out, h) }
  if (b) { const h = b instanceof Headers ? Object.fromEntries(b.entries()) : Array.isArray(b) ? Object.fromEntries(b) : b; Object.assign(out, h) }
  return out
}

function sfetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(input instanceof Request ? input.url : String(input))
  url.searchParams.set('_cb', String(Date.now()))
  const h = input instanceof Request ? mergeHeaders(input.headers, init?.headers) : mergeHeaders(init?.headers, undefined)
  h['Cache-Control'] = 'no-cache, no-store'
  return fetch(url.toString(), { ...init, headers: h, cache: 'no-store' } as RequestInit)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: sfetch },
})
