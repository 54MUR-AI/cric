import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

const FCC_BASE = 'https://tiles.arcgis.com/tiles/YnOQrIGdN9JGtBh4/arcgis/rest/services'

export const CARRIERS = {
  att: { label: 'AT&T', color: '#00A8E0', service: 'ATT_Mobility_LTE_Data' },
  verizon: { label: 'Verizon', color: '#EE0000', service: 'Verizon_LTE_Data' },
  tmobile: { label: 'T-Mobile', color: '#E20074', service: 'TMobile_LTE_Data' },
  uscellular: { label: 'UScellular', color: '#0057B8', service: 'UScellular_LTE_Data' },
}

const ColorTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const tint = this.options.tint
    img.onload = () => {
      if (ctx) {
        try {
          ctx.drawImage(img, 0, 0, 256, 256)
          ctx.globalCompositeOperation = 'source-in'
          ctx.fillStyle = tint
          ctx.fillRect(0, 0, 256, 256)
        } catch { /* tainted canvas — leave as-is */ }
      }
      done(null, canvas)
    }
    img.onerror = () => done(null, canvas)
    img.src = this.getTileUrl(coords)
    return canvas
  },
})

export default function CellCoverageLayer({ carriers }) {
  const map = useMap()

  useEffect(() => {
    const layers = carriers
      .map((key) => CARRIERS[key])
      .filter(Boolean)
      .map((c) => new ColorTileLayer(`${FCC_BASE}/${c.service}/MapServer/tile/{z}/{y}/{x}`, {
        tint: c.color,
        opacity: 0.45,
        maxNativeZoom: 13,
        maxZoom: 21,
        crossOrigin: true,
        attribution: '&copy; <a href="https://www.fcc.gov/BroadbandData/MobileMaps">FCC</a>',
      }))
    layers.forEach((l) => l.addTo(map))
    return () => { layers.forEach((l) => l.remove()) }
  }, [map, carriers])

  return null
}
