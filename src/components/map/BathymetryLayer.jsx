import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

const LAKE_STATS = {
  name: 'Cranberry Lake',
  area: '6,995 acres',
  meanDepth: '5.9 ft',
  maxDepth: '38 ft',
  elevation: '453 m (1,486 ft)',
  county: 'St. Lawrence, NY',
  pdfUrl: 'https://dec.ny.gov/sites/default/files/cbrylkmap.pdf',
}

export default function BathymetryLayer() {
  const map = useMap()
  const ctrlRef = useRef(null)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    const bg = isDark ? 'rgba(28,25,23,0.95)' : 'rgba(255,255,255,0.95)'
    const fg = isDark ? '#d6d3d1' : '#444'
    const muted = isDark ? '#a8a29e' : '#666'
    const titleFg = isDark ? '#7dd3fc' : '#1e3a5f'
    const linkClr = isDark ? '#60a5fa' : '#1a73e8'
    const borderClr = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    const Control = L.Control.extend({
      onAdd() {
        const container = L.DomUtil.create('div')
        container.innerHTML = `
          <div style="background:${bg};padding:10px 14px;border-radius:8px;font-size:11px;line-height:1.5;box-shadow:0 2px 10px rgba(0,0,0,0.15);border:1px solid ${borderClr};max-width:220px;color:${fg};">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:${titleFg};">Cranberry Lake</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:1px 4px 1px 0;color:${muted};">Area</td><td style="font-weight:600;">${LAKE_STATS.area}</td></tr>
              <tr><td style="padding:1px 4px 1px 0;color:${muted};">Mean depth</td><td style="font-weight:600;">${LAKE_STATS.meanDepth}</td></tr>
              <tr><td style="padding:1px 4px 1px 0;color:${muted};">Max depth</td><td style="font-weight:600;">${LAKE_STATS.maxDepth}</td></tr>
              <tr><td style="padding:1px 4px 1px 0;color:${muted};">Elevation</td><td style="font-weight:600;">${LAKE_STATS.elevation}</td></tr>
            </table>
            <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">
              <span style="display:inline-block;width:12px;height:12px;background:#e6f3ff;border:1px solid #b3d4f0;"></span>
              <span style="margin-right:6px;">Shallow</span>
              <span style="display:inline-block;width:12px;height:12px;background:#1a5276;border:1px solid #0e2f44;"></span>
              <span style="margin-right:6px;">Deep (38')</span>
            </div>
            <a href="${LAKE_STATS.pdfUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:3px;white-space:nowrap;margin-top:8px;color:${linkClr};font-size:11px;font-weight:600;text-decoration:underline;text-underline-offset:2px;cursor:pointer;">Contour Map →</a>
          </div>`
        return container
      },
    })
    const ctrl = new Control({ position: 'bottomleft' })
    ctrl.addTo(map)
    ctrlRef.current = ctrl
    return () => { ctrl.remove() }
  }, [map])

  return null
}
