import { useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { haversineKm } from '../../lib/map/utils'

export default function MeasureLayer({ points, onAddPoint, onClear }) {
  const map = useMap()
  const polylineRef = useRef(null)
  const markersRef = useRef([])

  useMapEvents({
    click(e) { if (onAddPoint) onAddPoint(e.latlng) },
  })

  useEffect(() => {
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []
    points.forEach((p, i) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#3b82f6;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${i + 1}</div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      })
      const m = L.marker([p.lat, p.lng], { icon }).addTo(map)
      markersRef.current.push(m)
    })
    return () => { markersRef.current.forEach(m => map.removeLayer(m)); markersRef.current = [] }
  }, [points, map])

  useEffect(() => {
    if (polylineRef.current) map.removeLayer(polylineRef.current)
    if (points.length < 2) { polylineRef.current = null; return }
    polylineRef.current = L.polyline(points.map(p => [p.lat, p.lng]), { color: '#3b82f6', weight: 2, dashArray: '6,4' }).addTo(map)
    return () => { if (polylineRef.current) map.removeLayer(polylineRef.current) }
  }, [points, map])

  useEffect(() => {
    if (points.length >= 2) {
      let total = 0
      for (let i = 1; i < points.length; i++) {
        total += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
      }
      map.eachLayer((layer) => { if (layer._measureLabel) map.removeLayer(layer) })
      const last = points[points.length - 1]
      const label = L.divIcon({
        className: '',
        html: `<div style="background:#1c1917;color:white;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${total.toFixed(2)} km</div>`,
        iconSize: [0, 0], iconAnchor: [0, 0],
      })
      const labelMarker = L.marker([last.lat, last.lng], { icon: label, interactive: false })
      labelMarker._measureLabel = true
      labelMarker.addTo(map)
    }
  }, [points, map])

  return null
}
