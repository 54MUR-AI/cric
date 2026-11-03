import L from 'leaflet'
import { PIN_COLORS, PIN_SVG } from './constants'
import { escapeHtml } from './utils'

export function pinIcon(type: string, label: string, cabinColor?: string): L.DivIcon {
  const color = cabinColor || PIN_COLORS[type] || '#6b7280'
  const svg = PIN_SVG[type] || PIN_SVG.other
  return L.divIcon({
    className: '',
    html: `<svg viewBox="0 0 16 16" fill="${escapeHtml(color)}" width="24" height="24" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));cursor:pointer;" title="${escapeHtml(label)}">${svg}</svg>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  })
}
