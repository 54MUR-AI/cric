import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

const NEXRAD_URL = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png'

export default function RadarLayer() {
  const map = useMap()
  const layerRef = useRef(null)
  const timerRef = useRef(null)

  function refresh() {
    if (layerRef.current) {
      layerRef.current.setUrl(`${NEXRAD_URL}?_t=${Date.now()}`)
    }
  }

  useEffect(() => {
    const layer = L.tileLayer(`${NEXRAD_URL}?_t=${Date.now()}`, {
      opacity: 0.5, attribution: 'Iowa State Mesonet / NOAA NEXRAD', transparent: true,
    })
    layer.addTo(map)
    layerRef.current = layer

    timerRef.current = setInterval(refresh, 300000)
    return () => {
      clearInterval(timerRef.current)
      layer.removeFrom(map)
      layerRef.current = null
    }
  }, [map])

  return null
}
