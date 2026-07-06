import { useState, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { RADAR_API, RADAR_TILES } from '../../lib/map/constants'

export default function RadarLayer() {
  const map = useMap()
  const [timestamps, setTimestamps] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const layerRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    fetch(RADAR_API).then(r => r.json()).then(d => {
      const past = d.radar.past?.map(f => f.time) || []
      setTimestamps(past)
      setCurrentIdx(past.length - 1)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (timestamps.length === 0) return
    const ts = timestamps[currentIdx]
    if (layerRef.current) {
      layerRef.current.setUrl(`${RADAR_TILES}/${ts}/256/{z}/{x}/{y}/2/1_1.png`)
    } else {
      layerRef.current = L.tileLayer(`${RADAR_TILES}/${ts}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.5, attribution: 'RainViewer', minZoom: 6, maxNativeZoom: 12, maxZoom: 21, transparent: true,
      })
      layerRef.current.addTo(map)
    }
  }, [currentIdx, timestamps, map])

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentIdx(prev => Math.max(0, prev - 1)), 1500)
    return () => clearInterval(timerRef.current)
  }, [timestamps])

  return null
}
