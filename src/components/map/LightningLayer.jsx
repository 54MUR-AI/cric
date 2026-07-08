import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { haversineKm } from '../../lib/map/utils'

const LIGHTNING_URL = 'https://lncewemrcsfqfzjgrcdu.supabase.co/functions/v1/intel-lightning'
const POLL_MS = 15_000
const ROLLING_WINDOW_MS = 90_000
const BLINK_DURATION_MS = 10_000
const BLINK_PERIOD_MS = 600
const PROXIMITY_KM = 50

const iconCache = {}

function buildIcon() {
  if (iconCache.cached) return iconCache.cached
  const s = 22
  const c = document.createElement('canvas')
  c.width = s; c.height = s
  const ctx = c.getContext('2d')
  if (!ctx) { iconCache.cached = c; return c }
  const cx = s / 2, cy = s / 2

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx)
  g.addColorStop(0, 'rgba(255,255,220,0.5)')
  g.addColorStop(0.5, 'rgba(255,200,50,0.2)')
  g.addColorStop(1, 'rgba(255,200,50,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, cx, 0, Math.PI * 2)
  ctx.fill()

  ctx.shadowColor = '#ffe44d'
  ctx.shadowBlur = 4
  ctx.beginPath()
  ctx.moveTo(11, 2.5)
  ctx.lineTo(7, 11.5)
  ctx.lineTo(10, 11.5)
  ctx.lineTo(6, 19.5)
  ctx.lineTo(14, 9)
  ctx.lineTo(11.5, 9)
  ctx.lineTo(15.5, 2.5)
  ctx.closePath()
  ctx.fillStyle = '#ffe44d'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 0.8
  ctx.stroke()

  iconCache.cached = c
  return c
}

export default function LightningLayer({ center, onStrikeNearby }) {
  const map = useMap()
  const markersRef = useRef(new Map())
  const strikeTimesRef = useRef(new Map())
  const knownIdsRef = useRef(new Set())
  const alertThrottleRef = useRef(0)
  const cancelledRef = useRef(false)

  const centerLat = center?.[0] ?? 44.14722
  const centerLon = center?.[1] ?? -74.81194

  useEffect(() => {
    cancelledRef.current = false
    knownIdsRef.current.clear()

    async function fetchStrikes() {
      try {
        const r = await fetch(LIGHTNING_URL)
        if (!r.ok || cancelledRef.current) return
        const data = await r.json()
        if (cancelledRef.current) return
        const now = Date.now()
        const cutoff = now - ROLLING_WINDOW_MS

        for (const f of data.features || []) {
          const strikeId = f.properties.id
          if (strikeId !== undefined) {
            if (knownIdsRef.current.has(strikeId)) continue
            knownIdsRef.current.add(strikeId)
          }

          const [lon, lat] = f.geometry.coordinates
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

          const timeMs = f.properties.time * 1000
          if (isNaN(timeMs) || timeMs < cutoff) continue

          const entityId = `lightning-${f.properties.id || `${lat}-${lon}-${timeMs}`}`
          if (markersRef.current.has(entityId)) continue

          const marker = L.marker([lat, lon], {
            icon: L.divIcon({
              className: '',
              html: `<canvas width="22" height="22"></canvas>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            }),
            interactive: false,
            keyboard: false,
          })
          marker._strikeTime = timeMs
          marker._entityId = entityId
          marker.addTo(map)
          markersRef.current.set(entityId, marker)
          strikeTimesRef.current.set(entityId, timeMs)

          const canvas = marker.getElement()?.querySelector('canvas')
          if (canvas) {
            const parent = canvas.parentElement
            const img = new Image()
            img.src = buildIcon().toDataURL()
            img.onload = () => { if (parent) parent.replaceChild(img, canvas) }
          }

          // proximity alert
          if (onStrikeNearby) {
            const dist = haversineKm(centerLat, centerLon, lat, lon)
            if (dist <= PROXIMITY_KM) {
              const now2 = Date.now()
              if (now2 - alertThrottleRef.current > 300000) {
                alertThrottleRef.current = now2
                onStrikeNearby({ lat, lon }, dist)
              }
            }
          }
        }

        // prune old markers
        for (const [id, marker] of markersRef.current) {
          const timeMs = strikeTimesRef.current.get(id)
          if (timeMs == null || (Date.now() - timeMs) > ROLLING_WINDOW_MS) {
            map.removeLayer(marker)
            markersRef.current.delete(id)
            strikeTimesRef.current.delete(id)
          }
        }
      } catch {
        // skip failed fetches
      }
    }

    fetchStrikes()
    const interval = setInterval(fetchStrikes, POLL_MS)
    return () => {
      cancelledRef.current = true
      clearInterval(interval)
      for (const [id, marker] of markersRef.current) {
        map.removeLayer(marker)
      }
      markersRef.current.clear()
      strikeTimesRef.current.clear()
      knownIdsRef.current.clear()
    }
  }, [map, onStrikeNearby, centerLat, centerLon])

  // blink animation loop (opacity toggle for recent strikes)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      for (const [id, marker] of markersRef.current) {
        const el = marker.getElement()
        if (!el) continue
        const strikeMs = strikeTimesRef.current.get(id)
        if (strikeMs == null) continue
        const age = now - strikeMs
        if (age < BLINK_DURATION_MS) {
          const show = (now % BLINK_PERIOD_MS < BLINK_PERIOD_MS / 2)
          el.style.opacity = show ? '1' : '0.3'
        }
      }
    }, BLINK_PERIOD_MS / 2)
    return () => clearInterval(interval)
  }, [])

  return null
}
