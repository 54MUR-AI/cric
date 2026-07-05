import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { Radio, Zap, Thermometer, Navigation, MapPin, Share2, ChevronLeft, Search, Maximize, Minimize, Crosshair, Pencil, Ruler, Wifi, Droplets, Flame } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { useWeatherStations } from '../hooks/useWeatherStations'
import { useMapPins } from '../hooks/useMapPins'
import { usePhotos } from '../hooks/usePhotos'
import { useCabins } from '../hooks/useCabins'
import { useBookings } from '../hooks/useBookings'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const CRANBERRY_LAKE = [44.2228, -74.8344]
const CHAIR_ROCK_ISLAND = [44.14722, -74.81194]
const RADAR_API = 'https://api.rainviewer.com/public/weather-maps.json'
const RADAR_TILES = 'https://tilecache.rainviewer.com/v2/radar'
const ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ESRI_TOPO = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
const ESRI_ATTR = '&copy; <a href="https://www.esri.com/">Esri</a>'

const PIN_COLORS = {
  cabin: '#10b981', boathouse: '#3b82f6', dock: '#06b6d4',
  'lean-to': '#d97706', firepit: '#ef4444', cell: '#8b5cf6', other: '#6b7280',
}

const PIN_SVG = {
  cabin: '<path d="M8 1L1 7h2v7h10V7h2L8 1zM6 10h4v4H6z"/>',
  boathouse: '<path d="M8 1L1 7h1v5h12V7h1L8 1zM3 12h10v3H3z"/>',
  dock: '<path d="M4 10h8v2H4zM6 12v3h1v-3M9 12v3h1v-3"/>',
  'lean-to': '<path d="M3 12L8 4l5 8H3zM2 12h12v2H2z"/>',
  firepit: '<path d="M8 4C6 6 5 8 5 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0-2-1-4-3-6zM3 13h10v1H3z"/>',
  cell: '<path d="M4 12h1l2-3 2 4 2-2 1 1h4"/>',
  other: '<path d="M8 3C5.6 3 3.5 5.1 3.5 7.5c0 2.8 4.5 6.5 4.5 6.5s4.5-3.7 4.5-6.5C12.5 5.1 10.4 3 8 3zm0 3.5c.8 0 1.5.7 1.5 1.5S8.8 9.5 8 9.5 6.5 8.8 6.5 8 7.2 6.5 8 6.5z"/>',
}

const GUIDE_SECTIONS = {
  'solar': '/guide#solar-start', 'generator': '/guide#generator',
  'water': '/guide#water', 'boats': '/guide#boats',
  'battery': '/guide#battery-reset',
}

const PIN_TYPE_LABELS = {
  cabin: 'Cabins', boathouse: 'Boathouse', dock: 'Docks',
  'lean-to': 'Lean-tos', firepit: 'Firepits', cell: 'Cell Service', other: 'Other',
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon)
  const brng = Math.atan2(y, x) * 180 / Math.PI
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(brng / 45) % 8]
}

function pinIcon(type, label, cabinColor) {
  const color = cabinColor || PIN_COLORS[type] || '#6b7280'
  const svg = PIN_SVG[type] || PIN_SVG.other
  return L.divIcon({
    className: '',
    html: `<svg viewBox="0 0 16 16" fill="${color}" width="24" height="24" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));cursor:pointer;" title="${label}">${svg}</svg>`,
    iconSize: [24, 24], iconAnchor: [12, 12],
  })
}

function WindArrow({ speed, direction, lat, lon, name, temp }) {
  if (speed == null || direction == null) return null
  const speedMph = Math.round(speed * 1.15078); const size = Math.min(24 + speed * 2, 48)
  if (lat == null || lon == null || isNaN(Number(lat)) || isNaN(Number(lon))) return null
  const icon = L.divIcon({
    className: '',
    html: `<div style="position:relative;width:48px;height:56px;text-align:center"><div style="position:absolute;bottom:24px;left:50%;margin-left:-2px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:${size}px solid rgba(220,38,38,0.85);transform-origin:bottom center;transform:translateY(-4px) rotate(${direction}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></div><div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.95);border:1px solid #d1d5db;border-radius:6px;padding:1px 5px;font-size:10px;font-weight:600;color:#1f2937;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${temp != null ? `${Math.round(temp)}°F` : ''} ${speedMph}mph</div></div>`,
    iconSize: [48, 56], iconAnchor: [24, 28],
  })
  return <Marker position={[lat, lon]} icon={icon}><Popup><strong>{name}</strong><br/>{temp != null ? `${Math.round(temp)}°F` : ''}<br/>Wind: ${speedMph} mph ${Math.round(direction)}°</Popup></Marker>
}

function RadarLayer() {
  const map = useMap(); const [timestamps, setTimestamps] = useState([]); const [currentIdx, setCurrentIdx] = useState(0)
  const layerRef = useRef(null); const timerRef = useRef(null)
  useEffect(() => { fetch(RADAR_API).then(r => r.json()).then(d => { const past = d.radar.past?.map(f => f.time) || []; setTimestamps(past); setCurrentIdx(past.length - 1) }).catch(() => {}) }, [])
  useEffect(() => { if (timestamps.length === 0) return; if (layerRef.current) map.removeLayer(layerRef.current); const ts = timestamps[currentIdx]; layerRef.current = L.tileLayer(`${RADAR_TILES}/${ts}/256/{z}/{x}/{y}/2/1_1.png`, { opacity: 0.5, attribution: 'RainViewer', minZoom: 6, maxZoom: 12, transparent: true }); layerRef.current.addTo(map); return () => { if (layerRef.current) map.removeLayer(layerRef.current) } }, [currentIdx, timestamps, map])
  useEffect(() => { timerRef.current = setInterval(() => setCurrentIdx(prev => Math.max(0, prev - 1)), 1500); return () => clearInterval(timerRef.current) }, [timestamps])
  return null
}

function LightningLayer({ onStrikeNearby }) {
  const map = useMap()
  const markersRef = useRef([])
  const wsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const markers = markersRef.current
    const seen = new Set()

    function pruneStrikes() {
      const cutoff = Date.now() - 120000
      for (let i = markers.length - 1; i >= 0; i--) {
        if (markers[i]._strikeTime < cutoff) {
          map.removeLayer(markers[i])
          markers.splice(i, 1)
        }
      }
    }

    function connect() {
      if (cancelled) return
      try {
        const ws = new WebSocket('wss://live.lightningmaps.org')
        wsRef.current = ws
        ws.binaryType = 'arraybuffer'

        ws.onopen = () => {
          ws.send(JSON.stringify({
            v: 24, i: {}, s: true, x: 0, w: 0, tx: 0, tw: 0,
            a: 4, z: 5, b: true, h: '', l: 0, t: 0,
            from_lightningmaps_org: true,
            p: [90, 180, -90, -180],
            r: 'feed',
          }))
        }

        ws.onmessage = (event) => {
          try {
            const text = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data)
            const msg = JSON.parse(text)
            const strokes = msg?.strokes ?? []
            for (const s of strokes) {
              if (!s.id || seen.has(s.id)) continue
              seen.add(s.id)
              if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) continue
              const icon = L.divIcon({
                className: '',
                html: '<div style="color:#fbbf24;font-size:18px;filter:drop-shadow(0 0 4px rgba(251,191,36,0.8));text-shadow:0 0 6px rgba(251,191,36,0.5);line-height:1;">⚡</div>',
                iconSize: [20, 20], iconAnchor: [10, 10],
              })
              const marker = L.marker([s.lat, s.lon], { icon }).addTo(map)
              marker._strikeTime = s.time
              markers.push(marker)
              if (onStrikeNearby) {
                const dist = haversineKm(CHAIR_ROCK_ISLAND[0], CHAIR_ROCK_ISLAND[1], s.lat, s.lon)
                if (dist < 15) onStrikeNearby(s, dist)
              }
            }
          } catch { /* skip unparseable */ }
        }

        ws.onclose = () => {
          if (!cancelled) setTimeout(connect, 5000)
        }

        ws.onerror = () => { ws.close() }

        const pruneInterval = setInterval(pruneStrikes, 30000)
        ws._pruneInterval = pruneInterval
      } catch { /* connection failed */ }
    }

    connect()

    return () => {
      cancelled = true
      if (wsRef.current) {
        clearInterval(wsRef.current._pruneInterval)
        wsRef.current.close()
        wsRef.current = null
      }
      markers.forEach(m => map.removeLayer(m))
      markers.length = 0
    }
  }, [map, onStrikeNearby])

  return null
}

function MeasureLayer({ points, onAddPoint, onClear }) {
  const map = useMap()
  const polylineRef = useRef(null)
  const markersRef = useRef([])

  useMapEvents({
    click(e) {
      if (onAddPoint) onAddPoint(e.latlng)
    },
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
      map.eachLayer((layer) => {
        if (layer._measureLabel) map.removeLayer(layer)
      })
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

function ForecastPopup({ latlng, data, loading, onClose }) {
  const map = useMap()
  useEffect(() => {
    if (latlng) map.flyTo([latlng.lat, latlng.lng], Math.max(map.getZoom(), 10), { duration: 0.5 })
  }, [latlng])
  if (!latlng || (!loading && !data)) return null
  const icon = L.divIcon({ className: '', html: '<div style="background:#0284c7;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
  return (
    <Marker position={[latlng.lat, latlng.lng]} icon={icon}>
      <Popup maxWidth={280} minWidth={200}>
        <div className="text-xs space-y-1 max-w-[260px]">
          {loading ? (
            <div className="flex items-center gap-2 text-stone-500"><span className="animate-spin h-3 w-3 border-2 border-stone-400 border-t-transparent rounded-full" /> Loading forecast...</div>
          ) : (
            <>
              <div className="font-bold text-stone-800 dark:text-stone-200 text-sm">{data?.location}</div>
              {data?.periods?.slice(0, 7).map((p, i) => (
                <div key={i} className={`flex items-start gap-2 py-1 ${i > 0 ? 'border-t border-stone-100 dark:border-stone-800' : ''}`}>
                  <span className="font-semibold text-stone-600 dark:text-stone-400 min-w-[60px]">{p.name}</span>
                  <span className="text-stone-700 dark:text-stone-300">{p.temp}°F {p.shortForecast}</span>
                </div>
              ))}
              <button onClick={onClose} className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800">Close</button>
            </>
          )}
        </div>
      </Popup>
    </Marker>
  )
}

function PhotosLayer({ photos }) {
  const geotagged = useMemo(() => photos.filter(p => p.latitude != null && p.longitude != null), [photos])
  if (geotagged.length === 0) return null
  return geotagged.map(photo => (
    <Marker key={photo.id} position={[photo.latitude, photo.longitude]} icon={L.divIcon({
      className: '',
      html: `<div style="width:32px;height:32px;border-radius:4px;overflow:hidden;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;"><img src="${photo.url}" alt="" style="width:100%;height:100%;object-fit:cover;" /></div>`,
      iconSize: [32, 32], iconAnchor: [16, 16],
    })}>
      <Popup>
        <div className="text-xs max-w-[200px]">
          <img src={photo.url} alt="" className="w-full h-24 object-cover rounded mb-1" />
          {photo.caption && <div className="text-stone-700 dark:text-stone-300 font-medium">{photo.caption}</div>}
          {photo.taken_at && <div className="text-stone-400 dark:text-stone-500">{new Date(photo.taken_at).toLocaleDateString()}</div>}
        </div>
      </Popup>
    </Marker>
  ))
}

function MapClickHandler({ active, onMapClick, onMapClickGeneral }) {
  useMapEvents({ click(e) { if (active) onMapClick(e.latlng); else if (onMapClickGeneral) onMapClickGeneral(e.latlng) } })
  return null
}

function UserLocationMarker({ position, accuracy }) {
  const map = useMap()
  useEffect(() => { if (position) map.flyTo(position, map.getZoom() < 13 ? 13 : map.getZoom(), { duration: 0.5 }) }, [position])
  if (!position) return null
  const accRadius = accuracy && accuracy < 1000 ? accuracy : 100
  return (
    <>
      <Circle center={position} radius={accRadius} pathOptions={{ color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.1, dashArray: '4' }} />
      <Marker position={position} icon={L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px rgba(59,130,246,0.5),0 2px 6px rgba(0,0,0,0.3);"><div style="width:8px;height:8px;background:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);animation:pulse 2s infinite;"></div></div><style>@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }</style>',
        iconSize: [18, 18], iconAnchor: [9, 9],
      })} />
    </>
  )
}

function LocateButton({ position }) {
  const map = useMap()
  return (
    <div className="absolute top-2 left-2 z-[800] pointer-events-none">
      <button onClick={() => { if (position) map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.5 }) }} disabled={!position} className="pointer-events-auto bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-md shadow-md border border-stone-200 dark:border-stone-700 p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors disabled:opacity-40" title="Center on my location">
        <Crosshair className="h-4 w-4" />
      </button>
    </div>
  )
}

function PinPopupContent({ pin, cabin, nextBooking, admin, onDelete, onEdit, onPhotoUpload }) {
  const dist = haversineKm(CRANBERRY_LAKE[0], CRANBERRY_LAKE[1], pin.latitude, pin.longitude)
  const dir = bearing(CRANBERRY_LAKE[0], CRANBERRY_LAKE[1], pin.latitude, pin.longitude)
  const pinColor = cabin?.color || PIN_COLORS[pin.type] || '#6b7280'
  const svg = PIN_SVG[pin.type] || PIN_SVG.other

  const guideKey = Object.keys(GUIDE_SECTIONS).find(k => pin.label.toLowerCase().includes(k) || pin.type === k)

  const handleShare = () => {
    const text = `${pin.label} — ${(dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`)} ${dir} of landing`
    if (navigator.share) navigator.share({ title: pin.label, text }).catch(() => {})
    else navigator.clipboard.writeText(text)
  }

  return (
    <div className="text-xs space-y-1.5 min-w-[180px]">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: pinColor }}>
          <svg viewBox="0 0 16 16" fill="white" width="10" height="10">{svg}</svg>
        </span>
        <strong className="text-sm text-stone-800 dark:text-stone-200">{pin.label}</strong>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <span className="capitalize text-stone-400 dark:text-stone-500">{pin.type}</span>
        {cabin && <><span className="text-stone-300 dark:text-stone-600">&middot;</span><span className="inline-flex items-center gap-0.5 text-stone-500 dark:text-stone-400"><span className="inline-block w-2 h-2 rounded-full" style={{ background: cabin.color }} />{cabin.name}</span></>}
      </div>
      {pin.description && <div className="text-stone-500 dark:text-stone-400">{pin.description}</div>}
      <div className="text-stone-400 dark:text-stone-500">{dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} {dir} of landing</div>

      {cabin && (
        <div className="space-y-1">
          <Link to="/cabins" className="block text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">View Cabin Details &rarr;</Link>
          <Link to="/schedule" className="block text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">Book This Cabin &rarr;</Link>
          {nextBooking && <div className="bg-stone-50 dark:bg-stone-950 rounded p-1.5 text-stone-500 dark:text-stone-400">Next: {nextBooking.guests || 'Someone'} &middot; {new Date(nextBooking.start_date).toLocaleDateString()}</div>}
        </div>
      )}

      {guideKey && <a href={GUIDE_SECTIONS[guideKey]} className="block text-amber-600 dark:text-amber-400 hover:text-amber-800 font-medium">View Guide &rarr;</a>}

      <button onClick={handleShare} className="inline-flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors mt-1"><Share2 className="h-3 w-3" /> Share</button>

      {pin.image_url && <img src={pin.image_url} alt="" className="w-full h-24 object-cover rounded mt-1" />}

      {admin && (
        <div className="flex gap-2 pt-1 border-t border-stone-200 dark:border-stone-700 mt-2">
          <button onClick={() => onEdit(pin)} className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 text-xs"><Pencil className="h-3 w-3" /> Edit</button>
          <label className="text-blue-600 dark:text-blue-400 hover:text-blue-800 cursor-pointer text-xs">Add Photo<input type="file" accept="image/*" className="hidden" onChange={(e) => onPhotoUpload(pin, e.target.files?.[0])} /></label>
          <button onClick={() => { if (confirm('Delete this pin?')) onDelete(pin.id) }} className="text-rose-600 dark:text-rose-400 hover:text-rose-800 text-xs">Delete</button>
        </div>
      )}
    </div>
  )
}

export default function MapPage({ compact, onLightningStrike } = {}) {
  const { isAdmin } = useAuth()
  const { stations, loading: stationsLoading } = useWeatherStations()
  const { pins, loading: pinsLoading, addPin, updatePin, deletePin, refresh: refreshPins } = useMapPins()
  const { photos } = usePhotos()
  const { cabins } = useCabins()
  const { bookings } = useBookings()

  const [showRadar, setShowRadar] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [showTrails, setShowTrails] = useState(true)
  const [showPins, setShowPins] = useState(true)
  const [showLightning, setShowLightning] = useState(true)
  const [showPhotos, setShowPhotos] = useState(false)
  const [showForecast, setShowForecast] = useState(false)
  const [showBathymetry, setShowBathymetry] = useState(false)
  const [showFireDanger, setShowFireDanger] = useState(false)
  const [showCellCoverage, setShowCellCoverage] = useState(false)
  const [fireDanger, setFireDanger] = useState(null)
  const [notifyPerm, setNotifyPerm] = useState(Notification.permission)
  const [baseLayer, setBaseLayer] = useState('satellite')
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [editingPin, setEditingPin] = useState(null)
  const [newPinLatLng, setNewPinLatLng] = useState(null)
  const [pinForm, setPinForm] = useState({ label: '', type: 'cabin', description: '', cabin_id: '' })
  const [pinError, setPinError] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const [measurePoints, setMeasurePoints] = useState([])
  const [forecastLatLng, setForecastLatLng] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState(Object.keys(PIN_COLORS))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const watchIdRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    if (trackingEnabled) {
      if (!navigator.geolocation) { setLocationError('Geolocation not available'); setTrackingEnabled(false); return }
      setLocationError(null)
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationAccuracy(pos.coords.accuracy); setLocationError(null) },
        (err) => { setLocationError(err.message); setTrackingEnabled(false) },
        { enableHighAccuracy: true, maximumAge: 30000 }
      )
    } else {
      if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null }
      setUserLocation(null); setLocationAccuracy(null); setLocationError(null)
    }
    return () => { if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null } }
  }, [trackingEnabled])

  const toast = useToast()
  const lastLightningAlertRef = useRef(0)
  const seenAlertIdsRef = useRef(new Set())

  useEffect(() => {
    if (notifyPerm !== 'granted' && Notification.permission === 'default') Notification.requestPermission().then(p => setNotifyPerm(p))
  }, [notifyPerm])

  function sendSystemNotification(title, body) {
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/images/icon-192.png' }) } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    let cancelled = false
    const checkAlerts = async () => {
      try {
        const r = await fetch('https://api.weather.gov/alerts/active?point=44.14722,-74.81194')
        const data = await r.json()
        if (cancelled) return
        const warnings = (data.features || []).filter(f => {
          const e = f.properties.event || ''
          return e.includes('Warning') || e.includes('Watch') || e === 'Severe Thunderstorm' || e.includes('Small Craft') || e.includes('Marine')
        })
        for (const w of warnings) {
          const id = w.properties.id
          if (!seenAlertIdsRef.current.has(id)) {
            seenAlertIdsRef.current.add(id)
            toast.warning(`${w.properties.event}: ${(w.properties.headline || w.properties.description || '').slice(0, 120)}`, 10000)
            sendSystemNotification(w.properties.event, (w.properties.headline || w.properties.description || '').slice(0, 120))
          }
        }
      } catch { /* ignore */ }
    }
    checkAlerts()
    const interval = setInterval(checkAlerts, 300000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [toast])

  useEffect(() => {
    let cancelled = false
    const fetchFireDanger = async () => {
      try {
        const r = await fetch('https://api.weather.gov/firewx/forecast?point=44.14722,-74.81194')
        const data = await r.json()
        if (cancelled || !data?.properties?.periods?.length) return
        const today = data.properties.periods[0]
        setFireDanger({ rating: today.name, color: today.color || (today.name?.includes('High') ? '#ef4444' : today.name?.includes('Moderate') ? '#f59e0b' : '#22c55e'), description: today.detailedForecast?.slice(0, 100) })
      } catch { /* ignore */ }
    }
    fetchFireDanger()
    const interval = setInterval(fetchFireDanger, 1800000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const handleStrikeNearby = useCallback((strike, distKm) => {
    const now = Date.now()
    if (now - lastLightningAlertRef.current > 300000) {
      lastLightningAlertRef.current = now
      const dir = bearing(CHAIR_ROCK_ISLAND[0], CHAIR_ROCK_ISLAND[1], strike.lat, strike.lon)
      const msg = `Lightning ${distKm.toFixed(1)}km ${dir} of Chair Rock Island! Take cover.`
      toast.warning(msg, 8000)
      sendSystemNotification('Lightning Alert', msg)
      if (onLightningStrike) onLightningStrike(msg)
    }
  }, [toast, onLightningStrike])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) mapRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  const cabinMap = useMemo(() => Object.fromEntries(cabins.map(c => [c.id, c])), [cabins])

  const filteredPins = useMemo(() => {
    let list = pins
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); list = list.filter(p => p.label.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)) }
    if (activeTypes.length < Object.keys(PIN_COLORS).length) { list = list.filter(p => activeTypes.includes(p.type)) }
    return list
  }, [pins, searchQuery, activeTypes])

  const getNextBooking = useCallback((cabinId) => {
    if (!cabinId) return null
    const now = new Date()
    return bookings.filter(b => b.cabin_id === cabinId && new Date(b.end_date) >= now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0]
  }, [bookings])

  const handleMapClick = useCallback((latlng) => { setNewPinLatLng(latlng) }, [])

  const handleMapClickGeneral = useCallback(async (latlng) => {
    if (showForecast && !measuring) {
      setForecastLatLng(latlng); setForecastLoading(true); setForecastData(null)
      try {
        const ptRes = await fetch(`https://api.weather.gov/points/${latlng.lat.toFixed(4)},${latlng.lng.toFixed(4)}`)
        const pt = await ptRes.json()
        if (pt?.properties?.forecast) {
          const fxRes = await fetch(pt.properties.forecast)
          const fx = await fxRes.json()
          setForecastData({
            location: pt.properties.relativeLocation?.properties?.city || 'Selected point',
            periods: (fx.properties?.periods || []).map(p => ({ name: p.name, temp: p.temperature, shortForecast: p.shortForecast })),
          })
        }
      } catch { /* ignore */ } finally { setForecastLoading(false) }
    }
  }, [showForecast, measuring])

  const handleSavePin = async () => {
    if (!pinForm.label.trim()) { setPinError('Label is required'); return }
    setSavingPin(true); setPinError('')
    try {
      if (editingPin) {
        const updates = { label: pinForm.label.trim(), type: pinForm.type, description: pinForm.description.trim() || null, cabin_id: pinForm.cabin_id || null }
        if (newPinLatLng) { updates.latitude = newPinLatLng.lat; updates.longitude = newPinLatLng.lng }
        await updatePin(editingPin.id, updates)
      } else if (newPinLatLng) {
        await addPin({ label: pinForm.label.trim(), type: pinForm.type, latitude: newPinLatLng.lat, longitude: newPinLatLng.lng, description: pinForm.description.trim() || null, cabin_id: pinForm.cabin_id || null })
      } else { return }
      setEditingPin(null); setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setIsAddingPin(false)
    } catch (err) { setPinError(err.message || 'Failed to save pin') } finally { setSavingPin(false) }
  }

  const handleCancelPin = () => { setEditingPin(null); setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setIsAddingPin(false); setPinError('') }

  const handleEditPin = useCallback((pin) => {
    setEditingPin(pin); setIsAddingPin(true); setNewPinLatLng({ lat: pin.latitude, lng: pin.longitude })
    setPinForm({ label: pin.label, type: pin.type, description: pin.description || '', cabin_id: pin.cabin_id || '' })
  }, [])

  const handlePhotoUpload = async (pin, file) => {
    if (!file) return
    const ext = file.name.split('.').pop(); const fileName = `pin_${pin.id}_${Date.now()}.${ext}`; const path = `pin_photos/${fileName}`
    const { error: upErr } = await supabase.storage.from('photos').upload(path, file)
    if (upErr) { alert('Upload failed'); return }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
    await supabase.from('map_pins').update({ image_url: publicUrl }).eq('id', pin.id)
    refreshPins()
  }

  const toggleType = (type) => {
    setActiveTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  const setBaseLayerFixed = (layer) => setBaseLayer(layer)

  const baseLayerLabels = { map: 'Map', satellite: 'Satellite', topo: 'Topo' }
  const baseLayerColors = { map: 'bg-stone-500', satellite: 'bg-purple-600', topo: 'bg-amber-700' }

  const overlayItems = [
    { key: 'showRadar', label: 'Radar', icon: Radio, activeColor: 'text-rose-500', pulsingDot: '#f43f5e' },
    { key: 'showStations', label: 'Weather Stations', icon: Thermometer, activeColor: 'text-orange-500' },
    { key: 'showTrails', label: 'Trails', icon: Navigation, activeColor: 'text-emerald-500' },
    { key: 'showPins', label: 'Pins', icon: MapPin, activeColor: 'text-sky-500' },
    { key: 'showLightning', label: 'Lightning', icon: Zap, activeColor: 'text-amber-500', pulsingDot: '#f59e0b' },
    { key: 'showForecast', label: 'Forecast on Click', icon: Thermometer, activeColor: 'text-sky-500' },
    { key: 'showPhotos', label: 'Geotagged Photos', icon: MapPin, activeColor: 'text-pink-500' },
    { key: 'showBathymetry', label: 'Bathymetry', icon: Droplets, activeColor: 'text-cyan-500' },
    { key: 'showFireDanger', label: 'Fire Danger', icon: Flame, activeColor: 'text-orange-500' },
    { key: 'showCellCoverage', label: 'Cell Coverage', icon: Wifi, activeColor: 'text-violet-500' },
  ]
  const valMap = { showRadar, showStations, showTrails, showPins, showLightning, showForecast, showPhotos, showBathymetry, showFireDanger, showCellCoverage }
  const setterMap = { showRadar: setShowRadar, showStations: setShowStations, showTrails: setShowTrails, showPins: setShowPins, showLightning: setShowLightning, showForecast: setShowForecast, showPhotos: setShowPhotos, showBathymetry: setShowBathymetry, showFireDanger: setShowFireDanger, showCellCoverage: setShowCellCoverage }

  const mapHeight = compact ? 'min-h-[250px] h-[250px] md:min-h-[400px] md:h-[400px]' : 'min-h-[450px]'
  const mapStyle = compact ? {} : { height: 'calc(100vh - 280px)' }

  return (
    <div className={compact ? '' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Cranberry Lake Map</h1>
            <p className="text-sm text-stone-400 dark:text-stone-500">Interactive map with weather, trails, and radar</p>
          </div>
          {isAdmin && (
            <button onClick={() => { setIsAddingPin(!isAddingPin); setEditingPin(null); setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setPinError('') }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition-colors text-xs ${isAddingPin ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-white dark:bg-stone-900 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700 hover:border-rose-400 dark:hover:border-rose-600'}`}>
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />{isAddingPin ? 'Cancel' : 'Add Pin'}
            </button>
          )}
        </div>
      )}

      <div ref={mapRef} className={`rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm dark:shadow-black/20 relative z-0 ${mapHeight}`} style={mapStyle}>
        <MapContainer center={CHAIR_ROCK_ISLAND} zoom={14} minZoom={8} maxZoom={21} className="h-full w-full" zoomControl={false} style={isAddingPin ? { cursor: 'crosshair' } : measuring ? { cursor: 'crosshair' } : {}}>
          <MapClickHandler active={isAddingPin} onMapClick={handleMapClick} onMapClickGeneral={handleMapClickGeneral} />
          <TileLayer key={baseLayer} attribution={baseLayer !== 'map' ? ESRI_ATTR : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'} url={baseLayer === 'satellite' ? ESRI_SAT : baseLayer === 'topo' ? ESRI_TOPO : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} maxZoom={baseLayer === 'map' ? 19 : 21} />
          {showTrails && <TileLayer attribution='&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>' url="https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png" opacity={0.7} />}
          {showRadar && <RadarLayer />}
          {showLightning && <LightningLayer onStrikeNearby={handleStrikeNearby} />}
          {measuring && <MeasureLayer points={measurePoints} onAddPoint={(latlng) => setMeasurePoints(prev => [...prev, latlng])} />}
          {showForecast && <ForecastPopup latlng={forecastLatLng} data={forecastData} loading={forecastLoading} onClose={() => { setForecastLatLng(null); setForecastData(null) }} />}
          {showPhotos && <PhotosLayer photos={photos} />}
          {showBathymetry && <TileLayer attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>' url="https://tile.opentopomap.org/{z}/{x}/{y}.png" opacity={0.45} />}
          {showFireDanger && fireDanger && (
            <Marker position={[44.14722, -74.81194]} icon={L.divIcon({ className: '', html: '', iconSize: [0, 0] })}>
              <Popup><div className="text-xs space-y-1"><div className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" style={{ color: fireDanger.color }} /><strong className="text-stone-800 dark:text-stone-200">{fireDanger.rating}</strong></div><div className="text-stone-500 dark:text-stone-400">{fireDanger.description}</div></div></Popup>
            </Marker>
          )}
          {showCellCoverage && pins.filter(p => p.type === 'cell').map(pin => (
            <Circle key={`cell-${pin.id}`} center={[pin.latitude, pin.longitude]} radius={500} pathOptions={{ color: '#8b5cf6', weight: 1, fillColor: '#8b5cf6', fillOpacity: 0.08, dashArray: '4' }} />
          ))}

          {showStations && stations.map((s) => (
            <WindArrow key={s.stationIdentifier} name={s.name} lat={s.latitude} lon={s.longitude} speed={s.observation?.windSpeed?.value} direction={s.observation?.windDirection?.value} temp={s.observation?.temperature?.value} />
          ))}

          {showPins && filteredPins.map((pin) => (
            <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={pinIcon(pin.type, pin.label, pin.cabin_id ? cabinMap[pin.cabin_id]?.color : null)}>
              <Popup>
                <PinPopupContent pin={pin} cabin={pin.cabin_id ? cabinMap[pin.cabin_id] : null} nextBooking={getNextBooking(pin.cabin_id)} admin={isAdmin} onEdit={handleEditPin} onDelete={deletePin} onPhotoUpload={handlePhotoUpload} />
              </Popup>
            </Marker>
          ))}

          {newPinLatLng && <Marker position={[newPinLatLng.lat, newPinLatLng.lng]} icon={L.divIcon({ className: '', html: '<div style="background:#e11d48;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">+</div>', iconSize: [20, 20], iconAnchor: [10, 10] })} />}

          <Marker position={CRANBERRY_LAKE} icon={L.divIcon({ className: '', html: '<div style="background:#059669;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">CL</div>', iconSize: [24, 24], iconAnchor: [12, 12] })}>
            <Popup><strong>Cranberry Lake</strong><br/>St. Lawrence County, NY</Popup>
          </Marker>
          {trackingEnabled && <UserLocationMarker position={userLocation} accuracy={locationAccuracy} />}
          {trackingEnabled && <LocateButton position={userLocation} />}
        </MapContainer>

        {/* Fullscreen button */}
        <div className="absolute top-2 right-2 z-[800] pointer-events-none">
          <button onClick={toggleFullscreen} className="pointer-events-auto bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-md shadow-md border border-stone-200 dark:border-stone-700 p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>

        {/* Collapsible right sidebar */}
        <div className="absolute right-0 top-0 bottom-0 z-[800] flex pointer-events-none">
          <div className="pointer-events-auto self-center -ml-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-white dark:bg-stone-900 rounded-l-md shadow-md border border-r-0 border-stone-200 dark:border-stone-700 p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors" title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
              <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
            </button>
          </div>
          {sidebarOpen && (
            <div className="pointer-events-auto w-56 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm shadow-lg border-l border-stone-200 dark:border-stone-700 overflow-y-auto text-xs">
              <div className="p-3 space-y-4">

                {/* Base Map */}
                <div>
                  <h4 className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Base Map</h4>
                  <div className="space-y-1">
                    {Object.entries(baseLayerLabels).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                        <input type="radio" name="baseLayer" checked={baseLayer === key} onChange={() => setBaseLayerFixed(key)} className="accent-stone-800 dark:accent-stone-200" />
                        <span className={`inline-block w-2 h-2 rounded-full ${baseLayerColors[key]}`} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Overlays */}
                <div>
                  <h4 className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Overlays</h4>
                  <div className="space-y-1">
                    {overlayItems.map(({ key, label, icon: Icon, activeColor, pulsingDot }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                        <input type="checkbox" checked={valMap[key]} onChange={() => setterMap[key](!valMap[key])} className="accent-stone-800 dark:accent-stone-200" />
                        <Icon className={`h-3.5 w-3.5 ${valMap[key] ? activeColor : 'text-stone-400'}`} />
                        {label}
                        {pulsingDot && valMap[key] && (
                          <span className="ml-auto flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75" style={{ backgroundColor: pulsingDot }}></span>
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: pulsingDot }}></span>
                          </span>
                        )}
                      </label>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                      <input type="checkbox" checked={trackingEnabled} onChange={() => setTrackingEnabled(!trackingEnabled)} className="accent-stone-800 dark:accent-stone-200" />
                      <Crosshair className={`h-3.5 w-3.5 ${trackingEnabled ? 'text-blue-500' : 'text-stone-400'}`} />
                      GPS Track
                      {trackingEnabled && <span className="ml-auto flex h-2 w-2"><span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                      <input type="checkbox" checked={measuring} onChange={() => { setMeasuring(!measuring); if (!measuring) setMeasurePoints([]) }} className="accent-stone-800 dark:accent-stone-200" />
                      <Ruler className={`h-3.5 w-3.5 ${measuring ? 'text-blue-500' : 'text-stone-400'}`} />
                      Measure
                      {measuring && <span className="ml-auto text-blue-500 text-[10px]">{measurePoints.length} pts</span>}
                    </label>
                    {measuring && measurePoints.length > 0 && (
                      <button onClick={() => setMeasurePoints([])} className="text-[10px] text-rose-500 dark:text-rose-400 hover:text-rose-700 pl-6">Clear points</button>
                    )}
                    {showFireDanger && fireDanger && (
                      <div className="flex items-center gap-1.5 pl-6 py-1 text-[10px]">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: fireDanger.color }} />
                        <span className="text-stone-500 dark:text-stone-400">{fireDanger.rating}</span>
                      </div>
                    )}
                    {locationError && <div className="text-[10px] text-rose-500 dark:text-rose-400 mt-1">{locationError}</div>}
                  </div>
                </div>

                {/* Pin Filters */}
                <div>
                  <h4 className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Pin Filters</h4>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400 dark:text-stone-500" />
                    <input type="text" placeholder="Search pins..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-md border border-stone-300 dark:border-stone-600 pl-6 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200" />
                  </div>
                  <div className="space-y-1">
                    {Object.entries(PIN_TYPE_LABELS).map(([type, label]) => {
                      const active = activeTypes.includes(type)
                      return (
                        <label key={type} className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                          <input type="checkbox" checked={active} onChange={() => toggleType(type)} className="accent-stone-800 dark:accent-stone-200" />
                          <span className="inline-block w-2 h-2 rounded-full" style={{ background: PIN_COLORS[type] }} />
                          {label}
                          <span className="ml-auto text-stone-400 dark:text-stone-500">{pins.filter(p => p.type === type).length}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Attribution */}
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700 text-[10px] text-stone-400 dark:text-stone-500 space-y-0.5">
                  <div>Radar: RainViewer</div>
                  <div>Trails: Waymarked Trails</div>
                  <div>Stations: Weather.gov</div>
                  <div>Lightning: Blitzortung.org</div>
                  <div>Marine Warnings: NWS</div>
                  <div>Bathymetry: OpenTopoMap</div>
                  <div>Fire Danger: NWS</div>
                  <div className="mt-1">{stationsLoading ? 'Loading stations...' : `${stations.length} stations`} &middot; {pins.length} pins</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {compact && isAdmin && (
          <div className="absolute top-2 left-2 z-[800]">
            <button onClick={() => { setIsAddingPin(!isAddingPin); setEditingPin(null); setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setPinError('') }} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 border transition-colors text-xs shadow-sm ${isAddingPin ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm text-rose-600 dark:text-rose-400 border-stone-300 dark:border-stone-600'}`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />{isAddingPin ? 'Cancel' : 'Add Pin'}
            </button>
          </div>
        )}

        {(newPinLatLng || editingPin) && (
          <div className="absolute bottom-4 left-4 right-4 z-[800] bg-white dark:bg-stone-900 rounded-lg shadow-xl dark:shadow-black/30 border border-stone-200 dark:border-stone-700 p-4 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-3">{editingPin ? 'Edit Pin' : 'Add Pin'}</h3>
            <div className="space-y-2">
              <input type="text" placeholder="Label *" value={pinForm.label} autoFocus onChange={e => setPinForm(f => ({ ...f, label: e.target.value }))} className="w-full rounded border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500" />
              <select value={pinForm.type} onChange={e => setPinForm(f => ({ ...f, type: e.target.value }))} className="w-full rounded border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500">
                {Object.keys(PIN_COLORS).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <select value={pinForm.cabin_id} onChange={e => setPinForm(f => ({ ...f, cabin_id: e.target.value }))} className="w-full rounded border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500">
                <option value="">No cabin linked</option>
                {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea placeholder="Description (optional)" value={pinForm.description} rows={2} onChange={e => setPinForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500" />
              {pinError && <p className="text-xs text-rose-600 dark:text-rose-400">{pinError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={handleCancelPin} className="rounded px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-600">Cancel</button>
                <button onClick={handleSavePin} disabled={savingPin} className="rounded px-3 py-1.5 text-xs text-white dark:text-stone-800 bg-stone-800 dark:bg-stone-200 hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-50">{savingPin ? 'Saving...' : 'Save Pin'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}