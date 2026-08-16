import { getCorsHeaders } from '../_shared/cors.ts'
import { authenticate, UA } from '../_shared/auth.ts'

const AIRNOW_BASE = 'https://www.airnowapi.org/aq/observation/latLong/current/'

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const cors = getCorsHeaders(origin)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const auth = await authenticate(req)
    if (!auth) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('AIRNOW_API_KEY')
    if (!apiKey) throw new Error('AIRNOW_API_KEY not configured as a secret')

    const url = new URL(req.url)
    const params = new URLSearchParams()
    params.set('format', 'application/json')
    params.set('latitude', url.searchParams.get('latitude') || '44.2228')
    params.set('longitude', url.searchParams.get('longitude') || '-74.8344')
    params.set('distance', url.searchParams.get('distance') || '50')

    const airResp = await fetch(`${AIRNOW_BASE}?${params.toString()}&API_KEY=${apiKey}`, {
      headers: { 'User-Agent': UA },
    })
    if (!airResp.ok) {
      throw new Error(`AirNow request failed: ${airResp.status}`)
    }
    const data = await airResp.json()

    return new Response(JSON.stringify(data), {
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
