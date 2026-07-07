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
    const Control = L.Control.extend({
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar')
        container.innerHTML = `
          <div style="background:rgba(255,255,255,0.95);padding:10px 14px;border-radius:8px;font-size:11px;line-height:1.5;box-shadow:0 2px 10px rgba(0,0,0,0.15);border:1px solid rgba(0,0,0,0.1);max-width:220px;color:#444;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#1e3a5f;">Cranberry Lake</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:1px 4px 1px 0;color:#666;">Area</td><td style="font-weight:600;">${LAKE_STATS.area}</td></tr>
              <tr><td style="padding:1px 4px 1px 0;color:#666;">Mean depth</td><td style="font-weight:600;">${LAKE_STATS.meanDepth}</td></tr>
              <tr><td style="padding:1px 4px 1px 0;color:#666;">Max depth</td><td style="font-weight:600;">${LAKE_STATS.maxDepth}</td></tr>
              <tr><td style="padding:1px 4px 1px 0;color:#666;">Elevation</td><td style="font-weight:600;">${LAKE_STATS.elevation}</td></tr>
            </table>
            <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;">
              <span style="display:inline-block;width:12px;height:12px;background:#e6f3ff;border:1px solid #b3d4f0;"></span>
              <span style="margin-right:6px;color:#666;">Shallow</span>
              <span style="display:inline-block;width:12px;height:12px;background:#1a5276;border:1px solid #0e2f44;"></span>
              <span style="margin-right:6px;color:#666;">Deep (38')</span>
            </div>
            <a href="${LAKE_STATS.pdfUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;color:#1a73e8;text-decoration:none;font-weight:600;font-size:11px;">PDF Contour Map ↗</a>
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
