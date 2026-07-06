import L from 'leaflet'
import { PIN_COLORS, PIN_SVG } from './constants'

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function bearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon)
  const brng = Math.atan2(y, x) * 180 / Math.PI
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(brng / 45) % 8]
}

export function pinIcon(type, label, cabinColor) {
  const color = cabinColor || PIN_COLORS[type] || '#6b7280'
  const svg = PIN_SVG[type] || PIN_SVG.other
  return L.divIcon({
    className: '',
    html: `<svg viewBox="0 0 16 16" fill="${color}" width="24" height="24" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));cursor:pointer;" title="${label}">${svg}</svg>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  })
}
