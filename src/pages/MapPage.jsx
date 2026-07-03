import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { Radio, Zap, Thermometer, Navigation, MapPin, Layers } from 'lucide-react'
import { useWeatherStations } from '../hooks/useWeatherStations'
import { useMapPins } from '../hooks/useMapPins'
import { useCabins } from '../hooks/useCabins'
import { useBookings } from '../hooks/useBookings'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const CRANBERRY_LAKE = [44.2228, -74.8344]
const RADAR_API = 'https://api.rainviewer.com/public/weather-maps.json'
const RADAR_TILES = 'https://tilecache.rainviewer.com/v2/radar'
const ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ESRI_TOPO = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
const ESRI_ATTR = '&copy; <a href="https://www.esri.com/">Esri</a>'

const PIN_COLORS = {
  cabin: '#10b981', boathouse: '#3b82f6', dock: '#06b6d4',
  'lean-to': '#d97706', firepit: '#ef4444', other: '#6b7280',
}

const GUIDE_SECTIONS = {
  'solar': '/guide#solar-start', 'generator': '/guide#generator',
  'water': '/guide#water', 'boats': '/guide#boats',
  'battery': '/guide#battery-reset',
}

const PIN_TYPE_LABELS = {
  cabin: 'Cabins', boathouse: 'Boathouse', dock: 'Docks',
  'lean-to': 'Lean-tos', firepit: 'Firepits', other: 'Other',
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

function pinIcon(type, label) {
  const bg = PIN_COLORS[type] || '#6b7280'
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;cursor:pointer;" title="${label}">${label.charAt(0).toUpperCase()}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
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

function LightningLayer() {
  const map = useMap()
  useEffect(() => { const layer = L.tileLayer('https://www.lightningmaps.org/tile/lightning/{z}/{x}/{y}/1/0/0', { opacity: 0.6, attribution: 'Blitzortung', minZoom: 5, maxZoom: 14 }); layer.addTo(map); return () => map.removeLayer(layer) }, [map])
  return null
}

function MapClickHandler({ active, onMapClick }) {
  useMapEvents({ click(e) { if (active) onMapClick(e.latlng) } })
  return null
}

function PinPopupContent({ pin, cabin, nextBooking, admin, onDelete, onPhotoUpload }) {
  const dist = haversineKm(CRANBERRY_LAKE[0], CRANBERRY_LAKE[1], pin.latitude, pin.longitude)
  const dir = bearing(CRANBERRY_LAKE[0], CRANBERRY_LAKE[1], pin.latitude, pin.longitude)

  const guideKey = Object.keys(GUIDE_SECTIONS).find(k => pin.label.toLowerCase().includes(k) || pin.type === k)

  return (
    <div className="text-xs space-y-1.5 min-w-[180px]">
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: PIN_COLORS[pin.type] || '#6b7280' }} />
        <strong className="text-sm">{pin.label}</strong>
      </div>
      <div><span className="capitalize text-stone-400">{pin.type}</span>{cabin && <span className="text-stone-400"> &middot; {cabin.color && <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: cabin.color }} />}{cabin.name || 'Linked cabin'}</span>}</div>
      {pin.description && <div className="text-stone-500">{pin.description}</div>}
      <div className="text-stone-400">{dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} {dir} of landing</div>

      {cabin && (
        <>
          <Link to={`/cabins`} className="block text-blue-600 hover:text-blue-800 font-medium">View Cabin Details &rarr;</Link>
          <Link to={`/schedule`} className="block text-blue-600 hover:text-blue-800 font-medium">Book This Cabin &rarr;</Link>
          {nextBooking && <div className="bg-stone-50 rounded p-1.5 text-stone-500">Next: {nextBooking.profiles?.display_name || 'Someone'} &middot; {new Date(nextBooking.start_date).toLocaleDateString()}</div>}
        </>
      )}

      {guideKey && <a href={GUIDE_SECTIONS[guideKey]} className="block text-amber-600 hover:text-amber-800 font-medium">View Guide &rarr;</a>}

      {pin.image_url && <img src={pin.image_url} alt="" className="w-full h-24 object-cover rounded mt-1" />}

      {admin && (
        <div className="flex gap-2 pt-1 border-t border-stone-200 mt-2">
          <label className="text-blue-600 hover:text-blue-800 cursor-pointer text-xs">📷 Add Photo<input type="file" accept="image/*" className="hidden" onChange={(e) => onPhotoUpload(pin, e.target.files?.[0])} /></label>
          <button onClick={() => { if (confirm('Delete this pin?')) onDelete(pin.id) }} className="text-rose-600 hover:text-rose-800 text-xs">Delete</button>
        </div>
      )}
    </div>
  )
}

export default function MapPage() {
  const { isAdmin } = useAuth()
  const { stations, loading: stationsLoading } = useWeatherStations()
  const { pins, loading: pinsLoading, addPin, deletePin, refresh: refreshPins } = useMapPins()
  const { cabins } = useCabins()
  const { bookings } = useBookings()

  const [showRadar, setShowRadar] = useState(true)
  const [showLightning, setShowLightning] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [showTrails, setShowTrails] = useState(true)
  const [showPins, setShowPins] = useState(true)
  const [baseLayer, setBaseLayer] = useState('map')
  const [isAddingPin, setIsAddingPin] = useState(false)
  const [newPinLatLng, setNewPinLatLng] = useState(null)
  const [pinForm, setPinForm] = useState({ label: '', type: 'cabin', description: '', cabin_id: '' })
  const [pinError, setPinError] = useState('')
  const [savingPin, setSavingPin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState(Object.keys(PIN_COLORS))

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

  const handleSavePin = async () => {
    if (!pinForm.label.trim()) { setPinError('Label is required'); return }
    if (!newPinLatLng) return
    setSavingPin(true); setPinError('')
    try {
      await addPin({ label: pinForm.label.trim(), type: pinForm.type, latitude: newPinLatLng.lat, longitude: newPinLatLng.lng, description: pinForm.description.trim() || null, cabin_id: pinForm.cabin_id || null })
      setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setIsAddingPin(false)
    } catch (err) { setPinError(err.message || 'Failed to add pin') } finally { setSavingPin(false) }
  }

  const handleCancelPin = () => { setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setIsAddingPin(false); setPinError('') }

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

  const cycleBaseMap = () => setBaseLayer(prev => prev === 'map' ? 'satellite' : prev === 'satellite' ? 'topo' : 'map')

  const baseLayerLabels = { map: 'Map', satellite: 'Satellite', topo: 'Topo' }
  const baseLayerColors = { map: 'bg-stone-500', satellite: 'bg-purple-600', topo: 'bg-amber-700' }

  const overlayButtons = [
    { key: 'showRadar', label: 'Radar', icon: Radio, color: 'bg-blue-500' },
    { key: 'showLightning', label: 'Lightning', icon: Zap, color: 'bg-amber-500' },
    { key: 'showStations', label: 'Weather Stn', icon: Thermometer, color: 'bg-red-500' },
    { key: 'showTrails', label: 'Trails', icon: Navigation, color: 'bg-green-600' },
    { key: 'showPins', label: 'Pins', icon: MapPin, color: 'bg-pink-500' },
  ]
  const valMap = { showRadar, showLightning, showStations, showTrails, showPins }
  const setterMap = { showRadar: setShowRadar, showLightning: setShowLightning, showStations: setShowStations, showTrails: setShowTrails, showPins: setShowPins }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Cranberry Lake Map</h1>
          <p className="text-sm text-stone-400">Interactive map with weather, trails, and radar</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {overlayButtons.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => setterMap[key](!valMap[key])} className={`inline-flex items-center gap-1.5 rounded-full px-2 md:px-3 py-1.5 border transition-colors ${valMap[key] ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}>
              {Icon && <Icon className="h-3.5 w-3.5" />}<span className="hidden md:inline">{label}</span>
            </button>
          ))}
          <button onClick={cycleBaseMap} className={`inline-flex items-center gap-1.5 rounded-full px-2 md:px-3 py-1.5 border transition-colors bg-white text-stone-500 border-stone-300 hover:border-stone-400`}>
            <Layers className="h-3.5 w-3.5" /><span className="hidden md:inline">{baseLayerLabels[baseLayer]}</span>
          </button>
          {isAdmin && (
            <button onClick={() => { setIsAddingPin(!isAddingPin); setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setPinError('') }} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition-colors ${isAddingPin ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-white text-rose-600 border-rose-300 hover:border-rose-400'}`}>
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />{isAddingPin ? 'Cancel' : 'Add Pin'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input type="text" placeholder="Search pins..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-stone-400 w-48" />
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PIN_TYPE_LABELS).map(([type, label]) => {
            const active = activeTypes.includes(type)
            return (
              <button key={type} onClick={() => toggleType(type)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${active ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: PIN_COLORS[type] }} />{label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-stone-200 shadow-sm relative" style={{ height: 'calc(100vh - 280px)', minHeight: 450 }}>
        <MapContainer center={CRANBERRY_LAKE} zoom={11} minZoom={8} maxZoom={19} className="h-full w-full" zoomControl={false} style={isAddingPin ? { cursor: 'crosshair' } : {}}>
          <MapClickHandler active={isAddingPin} onMapClick={handleMapClick} />
          <TileLayer key={baseLayer} attribution={baseLayer !== 'map' ? ESRI_ATTR : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'} url={baseLayer === 'satellite' ? ESRI_SAT : baseLayer === 'topo' ? ESRI_TOPO : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
          {showTrails && <TileLayer attribution='&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>' url="https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png" opacity={0.7} />}
          {showRadar && <RadarLayer />}
          {showLightning && <LightningLayer />}

          {showStations && stations.map((s) => (
            <WindArrow key={s.stationIdentifier} name={s.name} lat={s.latitude} lon={s.longitude} speed={s.observation?.windSpeed?.value} direction={s.observation?.windDirection?.value} temp={s.observation?.temperature?.value} />
          ))}

          {showPins && filteredPins.map((pin) => (
            <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={pinIcon(pin.type, pin.label)}>
              <Popup>
                <PinPopupContent pin={pin} cabin={pin.cabin_id ? cabinMap[pin.cabin_id] : null} nextBooking={getNextBooking(pin.cabin_id)} admin={isAdmin} onDelete={deletePin} onPhotoUpload={handlePhotoUpload} />
              </Popup>
            </Marker>
          ))}

          {newPinLatLng && <Marker position={[newPinLatLng.lat, newPinLatLng.lng]} icon={L.divIcon({ className: '', html: '<div style="background:#e11d48;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">+</div>', iconSize: [20, 20], iconAnchor: [10, 10] })} />}

          <Marker position={CRANBERRY_LAKE} icon={L.divIcon({ className: '', html: '<div style="background:#059669;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">CL</div>', iconSize: [24, 24], iconAnchor: [12, 12] })}>
            <Popup><strong>Cranberry Lake</strong><br/>St. Lawrence County, NY</Popup>
          </Marker>
        </MapContainer>

        {newPinLatLng && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white rounded-lg shadow-xl border border-stone-200 p-4 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-stone-800 mb-3">Add Pin</h3>
            <div className="space-y-2">
              <input type="text" placeholder="Label *" value={pinForm.label} autoFocus onChange={e => setPinForm(f => ({ ...f, label: e.target.value }))} className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
              <select value={pinForm.type} onChange={e => setPinForm(f => ({ ...f, type: e.target.value }))} className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
                {Object.keys(PIN_COLORS).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <select value={pinForm.cabin_id} onChange={e => setPinForm(f => ({ ...f, cabin_id: e.target.value }))} className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400">
                <option value="">No cabin linked</option>
                {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea placeholder="Description (optional)" value={pinForm.description} rows={2} onChange={e => setPinForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
              {pinError && <p className="text-xs text-rose-600">{pinError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={handleCancelPin} className="rounded px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 border border-stone-300">Cancel</button>
                <button onClick={handleSavePin} disabled={savingPin} className="rounded px-3 py-1.5 text-xs text-white bg-stone-800 hover:bg-stone-700 disabled:opacity-50">{savingPin ? 'Saving...' : 'Save Pin'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-stone-400">
        <span>Radar: RainViewer</span><span>Lightning: Blitzortung.org</span>
        <span>Trails: Waymarked Trails (OSM)</span><span>Stations: Weather.gov</span>
        {stationsLoading && <span>Loading stations...</span>}{!stationsLoading && <span>{stations.length} stations</span>}
        <span>{pins.length} pins</span>
      </div>
    </div>
  )
}