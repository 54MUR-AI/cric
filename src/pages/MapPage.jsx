import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useWeatherStations } from '../hooks/useWeatherStations'

const CRANBERRY_LAKE = [44.2228, -74.8344]
const RADAR_API = 'https://api.rainviewer.com/public/weather-maps.json'
const RADAR_TILES = 'https://tilecache.rainviewer.com/v2/radar'
const ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ESRI_ATTR = '&copy; <a href="https://www.esri.com/">Esri</a>'

function WindArrow({ speed, direction, lat, lon, name, temp }) {
  if (speed == null || direction == null) return null

  const speedMph = Math.round(speed * 1.15078)
  const size = Math.min(24 + speed * 2, 48)

  const icon = L.divIcon({
    className: '',
    html: `<div style="position:relative;width:48px;height:56px;text-align:center">
      <div style="
        position:absolute;bottom:24px;left:50%;margin-left:-2px;
        width:0;height:0;
        border-left:6px solid transparent;border-right:6px solid transparent;
        border-bottom:${size}px solid rgba(220,38,38,0.85);
        transform-origin:bottom center;
        transform:translateY(-4px) rotate(${direction}deg);
        filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      "></div>
      <div style="
        position:absolute;top:6px;left:50%;transform:translateX(-50%);
        background:rgba(255,255,255,0.95);border:1px solid #d1d5db;
        border-radius:6px;padding:1px 5px;
        font-size:10px;font-weight:600;color:#1f2937;
        white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);
      ">${temp != null ? `${Math.round(temp)}°F` : ''} ${speedMph}mph</div>
    </div>`,
    iconSize: [48, 56],
    iconAnchor: [24, 28],
  })

  if (lat == null || lon == null || isNaN(Number(lat)) || isNaN(Number(lon))) return null

  const pos = [lat, lon]
  return <Marker position={pos} icon={icon}><Popup><strong>{name}</strong><br/>{temp != null ? `${Math.round(temp)}°F` : ''}<br/>Wind: ${speedMph} mph ${Math.round(direction)}°</Popup></Marker>
}

function RadarLayer() {
  const map = useMap()
  const [timestamps, setTimestamps] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const layerRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    fetch(RADAR_API).then(r => r.json()).then(data => {
      const past = data.radar.past?.map(f => f.time) || []
      setTimestamps(past)
      setCurrentIdx(past.length - 1)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (timestamps.length === 0) return

    if (layerRef.current) map.removeLayer(layerRef.current)

    const ts = timestamps[currentIdx]
    layerRef.current = L.tileLayer(`${RADAR_TILES}/${ts}/256/{z}/{x}/{y}/2/1_1.png`, {
      opacity: 0.5,
      attribution: 'RainViewer',
      minZoom: 6,
      maxZoom: 12,
      transparent: true,
    })
    layerRef.current.addTo(map)

    return () => { if (layerRef.current) map.removeLayer(layerRef.current) }
  }, [currentIdx, timestamps, map])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentIdx(prev => Math.max(0, prev - 1))
    }, 1500)
    return () => clearInterval(timerRef.current)
  }, [timestamps])

  return null
}

function LightningLayer() {
  const map = useMap()

  useEffect(() => {
    const layer = L.tileLayer('https://www.lightningmaps.org/tile/lightning/{z}/{x}/{y}/1/0/0', {
      opacity: 0.6,
      attribution: 'Blitzortung',
      minZoom: 5,
      maxZoom: 14,
    })
    layer.addTo(map)
    return () => map.removeLayer(layer)
  }, [map])

  return null
}

export default function MapPage() {
  const { stations, loading } = useWeatherStations()
  const [showRadar, setShowRadar] = useState(true)
  const [showLightning, setShowLightning] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [showTrails, setShowTrails] = useState(true)
  const [isSatellite, setIsSatellite] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Cranberry Lake Map</h1>
          <p className="text-sm text-stone-400">Interactive map with weather, trails, and radar</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { key: 'showRadar', label: 'Radar', color: 'bg-blue-500' },
            { key: 'showLightning', label: 'Lightning', color: 'bg-amber-500' },
            { key: 'showStations', label: 'Weather Stn', color: 'bg-red-500' },
            { key: 'showTrails', label: 'Trails', color: 'bg-green-600' },
            { key: 'isSatellite', label: isSatellite ? 'Map' : 'Satellite', color: 'bg-purple-600' },
          ].map(({ key, label, color }) => {
            const val = key === 'showRadar' ? showRadar : key === 'showLightning' ? showLightning : key === 'showStations' ? showStations : key === 'showTrails' ? showTrails : isSatellite
            const setter = key === 'showRadar' ? setShowRadar : key === 'showLightning' ? setShowLightning : key === 'showStations' ? setShowStations : key === 'showTrails' ? setShowTrails : setIsSatellite
            return (
              <button key={key} onClick={() => setter(!val)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition-colors ${val ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}>
                <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-stone-200 shadow-sm" style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>
        <MapContainer center={CRANBERRY_LAKE} zoom={11} minZoom={8} className="h-full w-full" zoomControl={false}>
          <TileLayer
            attribution={isSatellite ? ESRI_ATTR : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'}
            url={isSatellite ? ESRI_SAT : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
          />

          {showTrails && (
            <TileLayer
              attribution='&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>'
              url="https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png"
              opacity={0.7}
            />
          )}

          {showRadar && <RadarLayer />}
          {showLightning && <LightningLayer />}

          {showStations && stations.map((s) => (
            <WindArrow
              key={s.stationIdentifier}
              name={s.name}
              lat={s.latitude}
              lon={s.longitude}
              speed={s.observation?.windSpeed?.value}
              direction={s.observation?.windDirection?.value}
              temp={s.observation?.temperature?.value}
            />
          ))}

          {/* Cranberry Lake marker */}
          <Marker position={CRANBERRY_LAKE} icon={L.divIcon({ className: '', html: '<div style="background:#059669;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">CL</div>', iconSize: [24, 24], iconAnchor: [12, 12] })}>
            <Popup><strong>Cranberry Lake</strong><br/>St. Lawrence County, NY</Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-stone-400">
        <span>Radar: RainViewer</span>
        <span>Lightning: Blitzortung.org</span>
        <span>Trails: Waymarked Trails (OSM)</span>
        <span>Stations: Weather.gov</span>
        {loading && <span>Loading stations...</span>}
        {!loading && <span>{stations.length} stations</span>}
      </div>
    </div>
  )
}
