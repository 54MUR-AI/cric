import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { CHAIR_ROCK_ISLAND } from '../../lib/map/constants'
import { haversineKm } from '../../lib/map/utils'

export default function LightningLayer({ onStrikeNearby }) {
  const map = useMap()
  const markersRef = useRef([])
  const wsRef = useRef(null)
  const pruneIntervalRef = useRef(null)
  const onStrikeNearbyRef = useRef(onStrikeNearby)
  onStrikeNearbyRef.current = onStrikeNearby

  useEffect(() => {
    let cancelled = false
    const markers = markersRef.current
    const seen = new Set()

    function pruneStrikes() {
      const cutoff = Date.now() - 120000
      for (let i = markers.length - 1; i >= 0; i--) {
        if (markers[i]._strikeTime < cutoff) {
          map.removeLayer(markers[i])
          markers.splice(i, 1)
        }
      }
    }

    function connect() {
      if (cancelled) return
      if (pruneIntervalRef.current) clearInterval(pruneIntervalRef.current)
      pruneIntervalRef.current = null
      try {
        const ws = new WebSocket('wss://live.lightningmaps.org')
        wsRef.current = ws
        ws.binaryType = 'arraybuffer'

        ws.onopen = () => {
          ws.send(JSON.stringify({
            v: 24, i: {}, s: true, x: 0, w: 0, tx: 0, tw: 0,
            a: 4, z: 5, b: true, h: '', l: 0, t: 0,
            from_lightningmaps_org: true,
            p: [90, 180, -90, -180],
            r: 'feed',
          }))
        }

        ws.onmessage = (event) => {
          try {
            const text = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)
            const msg = JSON.parse(text)
            const strokes = msg?.strokes ?? []
            for (const s of strokes) {
              if (!s.id || seen.has(s.id)) continue
              seen.add(s.id)
              if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) continue
              const icon = L.divIcon({
                className: '',
                html: '<div style="color:#fbbf24;font-size:18px;filter:drop-shadow(0 0 4px rgba(251,191,36,0.8));text-shadow:0 0 6px rgba(251,191,36,0.5);line-height:1;">⚡</div>',
                iconSize: [20, 20], iconAnchor: [10, 10],
              })
              const marker = L.marker([s.lat, s.lon], { icon }).addTo(map)
              marker._strikeTime = s.time
              markers.push(marker)
              if (onStrikeNearbyRef.current) {
                const dist = haversineKm(CHAIR_ROCK_ISLAND[0], CHAIR_ROCK_ISLAND[1], s.lat, s.lon)
                if (dist < 15) onStrikeNearbyRef.current(s, dist)
              }
            }
          } catch { /* skip unparseable */ }
        }

        ws.onclose = () => { if (!cancelled) setTimeout(connect, 10000) }
        ws.onerror = () => { ws.close() }
        pruneIntervalRef.current = setInterval(pruneStrikes, 30000)
      } catch { /* connection failed */ }
    }

    connect()

    return () => {
      cancelled = true
      if (pruneIntervalRef.current) clearInterval(pruneIntervalRef.current)
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
      markers.forEach(m => map.removeLayer(m))
      markers.length = 0
    }
  }, [map])

  return null
}
