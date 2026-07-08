import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

function sfetch(input: RequestInfo | URL, init?: RequestInit) {
  if (input instanceof Request) {
    const url = new URL(input.url)
    url.searchParams.set('_cb', String(Date.now()))
    const h = new Headers(input.headers)
    h.set('Cache-Control', 'no-cache, no-store')
    return fetch(new Request(url, { body: input.body, method: input.method, headers: h, cache: 'no-store' }))
  }
  const str = String(input)
  const sep = str.includes('?') ? '&' : '?'
  return fetch(str + sep + '_cb=' + Date.now(), { ...init, cache: 'no-store', headers: { ...(init?.headers as Record<string, string> | undefined), 'Cache-Control': 'no-cache, no-store' } })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: sfetch },
})
