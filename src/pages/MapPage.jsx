import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Radio, Zap, Thermometer, Navigation, MapPin, ChevronLeft, Search, Maximize, Minimize, Crosshair, Ruler, Wifi, Droplets, Flame, CloudSun, Image, Loader } from 'lucide-react'
import { SkeletonSidebar } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { useWeatherStations } from '../hooks/useWeatherStations'
import { useMapPins } from '../hooks/useMapPins'
import { usePhotos } from '../hooks/usePhotos'
import { useCabins } from '../hooks/useCabins'
import { useBookings } from '../hooks/useBookings'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

import RadarLayer from '../components/map/RadarLayer'
import LightningLayer from '../components/map/LightningLayer'
import BathymetryLayer from '../components/map/BathymetryLayer'
import MeasureLayer from '../components/map/MeasureLayer'
import ForecastPopup from '../components/map/ForecastPopup'
import PhotosLayer from '../components/map/PhotosLayer'
import MapClickHandler from '../components/map/MapClickHandler'
import UserLocationMarker from '../components/map/UserLocationMarker'
import LocateButton from '../components/map/LocateButton'
import WindArrow from '../components/map/WindArrow'
import PinPopupContent from '../components/map/PinPopupContent'
import { CHAIR_ROCK_ISLAND, CRANBERRY_LAKE, PIN_COLORS, PIN_TYPE_LABELS, ESRI_SAT, ESRI_TOPO, ESRI_ATTR } from '../lib/map/constants'
import { bearing, pinIcon } from '../lib/map/utils'

export default function MapPage({ compact, onLightningStrike } = {}) {
  const { isAdmin } = useAuth()
  const { stations, loading: stationsLoading } = useWeatherStations()
  const { pins, loading: pinsLoading, addPin, updatePin, deletePin, refresh: refreshPins } = useMapPins()
  const { photos } = usePhotos()
  const { cabins } = useCabins()
  const { bookings } = useBookings()
  const cabinCenterKey = pins.filter(p => p.type === 'cabin').map(p => `${p.latitude},${p.longitude}`).join('|')
  const cabinCenter = useMemo(() => {
    const cabinPins = pins.filter(p => p.type === 'cabin')
    if (cabinPins.length === 0) return undefined
    const lat = cabinPins.reduce((s, p) => s + p.latitude, 0) / cabinPins.length
    const lon = cabinPins.reduce((s, p) => s + p.longitude, 0) / cabinPins.length
    return [lat, lon]
  }, [cabinCenterKey])

  const [showRadar, setShowRadar] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [showTrails, setShowTrails] = useState(true)
  const [showPins, setShowPins] = useState(true)
  const [showLightning, setShowLightning] = useState(true)
  const [showPhotos, setShowPhotos] = useState(false)
  const [showForecast, setShowForecast] = useState(false)
  const [showBathymetry, setShowBathymetry] = useState(true)
  const [showFireDanger, setShowFireDanger] = useState(true)
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

  useEffect(() => {
    if (notifyPerm !== 'granted' && Notification.permission === 'default') Notification.requestPermission().then(p => setNotifyPerm(p))
  }, [notifyPerm])

  function sendSystemNotification(title, body) {
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/icons/icon-192x192.png' }) } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    let cancelled = false
    const checkRedFlag = async () => {
      try {
        const r = await fetch('https://api.weather.gov/alerts/active?point=44.14722,-74.81194', { headers: { 'User-Agent': '(cric.app, denali.2.foxtrot@gmail.com)' } })
        if (!r.ok) return
        const data = await r.json()
        if (cancelled) return
        const rf = (data.features || []).find(f => /red flag/i.test(f.properties.event || ''))
        if (rf) {
          setFireDanger({ rating: 'Red Flag Warning', color: '#ef4444', description: (rf.properties.headline || rf.properties.description || '').slice(0, 100) })
        } else {
          setFireDanger(null)
        }
      } catch { /* ignore */ }
    }
    checkRedFlag()
    const interval = setInterval(checkRedFlag, 600000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const cabinCenterRef = useRef(cabinCenter)
  cabinCenterRef.current = cabinCenter

  const handleStrikeNearby = useCallback((strike, distKm) => {
    const now = Date.now()
    if (now - lastLightningAlertRef.current > 300000) {
      lastLightningAlertRef.current = now
      const c = cabinCenterRef.current ?? CHAIR_ROCK_ISLAND
      const dir = bearing(c[0], c[1], strike.lat, strike.lon)
      const msg = `Lightning ${distKm.toFixed(1)}km ${dir}! Take cover.`
      toast.warning(msg, 8000)
      sendSystemNotification('Lightning Alert', msg)
      if (onLightningStrike) onLightningStrike(msg)
    }
  }, [toast, onLightningStrike])

  const handleAllClear = useCallback(() => {
    const msg = 'No lightning detected in the last 30 minutes — all clear.'
    toast.success(msg, 8000)
    sendSystemNotification('Lightning All Clear', msg)
  }, [toast])

  const handleStrikeNearbyRef = useRef(handleStrikeNearby)
  handleStrikeNearbyRef.current = handleStrikeNearby

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
    if (upErr && toast) { toast.error('Upload failed'); return }
    if (upErr) return
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

  const overlayGroups = [
    {
      label: 'Weather', items: [
        { key: 'showRadar', label: 'Radar', icon: Radio, activeColor: 'text-rose-500', pulsingDot: '#f43f5e' },
        { key: 'showLightning', label: 'Lightning', icon: Zap, activeColor: 'text-amber-500', pulsingDot: '#f59e0b' },
        { key: 'showStations', label: 'Weather Stations', icon: Thermometer, activeColor: 'text-orange-500' },
        { key: 'showFireDanger', label: 'Fire Danger', icon: Flame, activeColor: 'text-orange-500' },
        { key: 'showForecast', label: 'Forecast on Click', icon: CloudSun, activeColor: 'text-sky-500' },
      ]
    },
    {
      label: 'Map Features', items: [
        { key: 'showTrails', label: 'Trails', icon: Navigation, activeColor: 'text-emerald-500' },
        { key: 'showBathymetry', label: 'Bathymetry', icon: Droplets, activeColor: 'text-cyan-500' },
        { key: 'showCellCoverage', label: 'Cell Coverage', icon: Wifi, activeColor: 'text-violet-500' },
      ]
    },
    {
      label: 'Pins & Photos', items: [
        { key: 'showPins', label: 'Pins', icon: MapPin, activeColor: 'text-sky-500' },
        { key: 'showPhotos', label: 'Geotagged Photos', icon: Image, activeColor: 'text-pink-500' },
      ]
    },
  ]
  const valMap = { showRadar, showStations, showTrails, showPins, showLightning, showForecast, showPhotos, showBathymetry, showFireDanger, showCellCoverage }
  const setterMap = { showRadar: setShowRadar, showStations: setShowStations, showTrails: setShowTrails, showPins: setShowPins, showLightning: setShowLightning, showForecast: setShowForecast, showPhotos: setShowPhotos, showBathymetry: setShowBathymetry, showFireDanger: setShowFireDanger, showCellCoverage: setShowCellCoverage }

  const mapHeight = compact ? 'min-h-[250px] h-[250px] md:min-h-[400px] md:h-[400px]' : 'min-h-[450px]'
  const mapStyle = compact ? {} : { height: 'calc(100vh - 280px)' }

  const sidebarContent = stationsLoading && pinsLoading ? (
    <SkeletonSidebar />
  ) : (
    <div className="p-3 space-y-4">
      <div>
        <h4 className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Base Map</h4>
        <div className="space-y-1">
          {Object.entries(baseLayerLabels).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
              <input type="radio" name="baseLayer" aria-label={`${label} base map`} checked={baseLayer === key} onChange={() => setBaseLayerFixed(key)} className="accent-stone-800 dark:accent-stone-200" />
              <span className={`inline-block w-2 h-2 rounded-full ${baseLayerColors[key]}`} />
              {label}
            </label>
          ))}
        </div>
      </div>
      {overlayGroups.map(group => (
        <div key={group.label}>
          <h5 className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">{group.label}</h5>
          <div className="space-y-1">
            {group.items.map(({ key, label, icon: Icon, activeColor, pulsingDot }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                <input type="checkbox" aria-label={`Toggle ${label}`} checked={valMap[key]} onChange={() => setterMap[key](!valMap[key])} className="accent-stone-800 dark:accent-stone-200" />
                <Icon className={`h-3.5 w-3.5 ${valMap[key] ? activeColor : 'text-stone-400'}`} />
                {label}
                {pulsingDot && valMap[key] && (
                  <span className="ml-auto flex h-2 w-2" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75" style={{ backgroundColor: pulsingDot }}></span>
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: pulsingDot }}></span>
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div>
        <h5 className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Tools</h5>
        <div className="space-y-1">
          <label className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
            <input type="checkbox" aria-label="Toggle GPS tracking" checked={trackingEnabled} onChange={() => setTrackingEnabled(!trackingEnabled)} className="accent-stone-800 dark:accent-stone-200" />
            <Crosshair className={`h-3.5 w-3.5 ${trackingEnabled ? 'text-blue-500' : 'text-stone-400'}`} />
            GPS Track
            {trackingEnabled && <span className="ml-auto flex h-2 w-2" aria-hidden="true"><span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
          </label>
          <label className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
            <input type="checkbox" aria-label="Toggle measurement tool" checked={measuring} onChange={() => { setMeasuring(!measuring); if (!measuring) setMeasurePoints([]) }} className="accent-stone-800 dark:accent-stone-200" />
            <Ruler className={`h-3.5 w-3.5 ${measuring ? 'text-blue-500' : 'text-stone-400'}`} />
            Measure
            {measuring && <span className="ml-auto text-blue-500 text-[10px]">{measurePoints.length} pts</span>}
          </label>
          {measuring && measurePoints.length > 0 && (
            <button onClick={() => setMeasurePoints([])} aria-label="Clear measurement points" className="text-[10px] text-rose-500 dark:text-rose-400 hover:text-rose-700 pl-6">Clear points</button>
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
      <div>
        <h4 className="font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Pin Filters</h4>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400 dark:text-stone-500" />
          <input type="text" placeholder="Search pins..." aria-label="Search pins" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-md border border-stone-300 dark:border-stone-600 pl-6 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200" />
        </div>
        <div className="space-y-1">
          {Object.entries(PIN_TYPE_LABELS).map(([type, label]) => {
            const active = activeTypes.includes(type)
            return (
              <label key={type} className="flex items-center gap-2 cursor-pointer py-1 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                <input type="checkbox" aria-label={`Filter ${label} pins`} checked={active} onChange={() => toggleType(type)} className="accent-stone-800 dark:accent-stone-200" />
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: PIN_COLORS[type] }} />
                {label}
                <span className="ml-auto text-stone-400 dark:text-stone-500">{pinsLoading ? <span className="inline-block h-3 w-5 bg-stone-200 dark:bg-stone-700 rounded animate-pulse align-middle" /> : pins.filter(p => p.type === type).length}</span>
              </label>
            )
          })}
        </div>
      </div>
      <div className="pt-2 border-t border-stone-200 dark:border-stone-700 text-[10px] text-stone-400 dark:text-stone-500 space-y-0.5">
        <div>Radar: RainViewer</div>
        <div>Trails: Waymarked Trails</div>
        <div>Stations: Weather.gov</div>
        <div>Lightning: Blitzortung.org</div>
        <div>Marine Warnings: NWS</div>
        <div>Bathymetry: OpenTopoMap</div>
        <div>Fire Danger: NWS</div>
        <div className="mt-1" role="status" aria-live="polite">
          {stationsLoading ? <span className="inline-block h-3 w-16 bg-stone-200 dark:bg-stone-700 rounded animate-pulse align-middle" /> : `${stations.length} stations`}
          <span className="mx-1">&middot;</span>
          {pinsLoading ? <span className="inline-block h-3 w-12 bg-stone-200 dark:bg-stone-700 rounded animate-pulse align-middle" /> : `${pins.length} pins`}
        </div>
      </div>
    </div>
  )

  return (
    <div className={compact ? '' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Cranberry Lake Map</h1>
            <p className="text-sm text-stone-400 dark:text-stone-500">Interactive map with weather, trails, and radar</p>
          </div>
          {isAdmin && (
            <button onClick={() => { setIsAddingPin(!isAddingPin); setEditingPin(null); setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setPinError('') }} aria-label={isAddingPin ? 'Cancel adding pin' : 'Add pin'} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition-colors text-xs ${isAddingPin ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-white dark:bg-stone-900 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700 hover:border-rose-400 dark:hover:border-rose-600'}`}>
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />{isAddingPin ? 'Cancel' : 'Add Pin'}
            </button>
          )}
        </div>
      )}

      <div ref={mapRef} className={`rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm dark:shadow-black/20 relative z-0 ${mapHeight}`} style={mapStyle}>
        <MapContainer center={CHAIR_ROCK_ISLAND} zoom={17} minZoom={8} maxZoom={21} className="h-full w-full" zoomControl={false} style={isAddingPin ? { cursor: 'crosshair' } : measuring ? { cursor: 'crosshair' } : {}}>
          <MapClickHandler active={isAddingPin} onMapClick={handleMapClick} onMapClickGeneral={handleMapClickGeneral} />
          <TileLayer key={baseLayer} attribution={baseLayer !== 'map' ? ESRI_ATTR : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'} url={baseLayer === 'satellite' ? ESRI_SAT : baseLayer === 'topo' ? ESRI_TOPO : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} maxZoom={baseLayer === 'map' ? 19 : 21} />
          {showTrails && <TileLayer attribution='&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a>' url="https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png" opacity={0.7} />}
          {showRadar && <RadarLayer />}
          {showLightning && <LightningLayer center={cabinCenter} onStrikeNearby={handleStrikeNearby} onAllClear={handleAllClear} />}
          {measuring && <MeasureLayer points={measurePoints} onAddPoint={(latlng) => setMeasurePoints(prev => [...prev, latlng])} />}
          {showForecast && <ForecastPopup latlng={forecastLatLng} data={forecastData} loading={forecastLoading} onClose={() => { setForecastLatLng(null); setForecastData(null) }} />}
          {showPhotos && <PhotosLayer photos={photos} />}
          {showBathymetry && <><BathymetryLayer /><TileLayer attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>' url="https://tile.opentopomap.org/{z}/{x}/{y}.png" opacity={0.45} /></>}
          {showFireDanger && fireDanger && (
            <Marker position={[44.14722, -74.81194]} icon={L.divIcon({ className: '', html: '', iconSize: [0, 0] })}>
              <Popup maxWidth={260} autoPanPadding={[50, 50]}><div className="text-xs space-y-1"><div className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" style={{ color: fireDanger.color }} /><strong className="text-stone-800 dark:text-stone-200">{fireDanger.rating}</strong></div><div className="text-stone-500 dark:text-stone-400">{fireDanger.description}</div></div></Popup>
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
              <Popup maxWidth={260} autoPanPadding={[50, 50]}>
                <PinPopupContent pin={pin} cabin={pin.cabin_id ? cabinMap[pin.cabin_id] : null} nextBooking={getNextBooking(pin.cabin_id)} admin={isAdmin} onEdit={handleEditPin} onDelete={deletePin} onPhotoUpload={handlePhotoUpload} />
              </Popup>
            </Marker>
          ))}

          {newPinLatLng && <Marker position={[newPinLatLng.lat, newPinLatLng.lng]} icon={L.divIcon({ className: '', html: '<div style="background:#e11d48;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">+</div>', iconSize: [20, 20], iconAnchor: [10, 10] })} />}

          <Marker position={CRANBERRY_LAKE} icon={L.divIcon({ className: '', html: '<div style="background:#059669;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">CL</div>', iconSize: [24, 24], iconAnchor: [12, 12] })}>
            <Popup maxWidth={260} autoPanPadding={[50, 50]}><strong>Cranberry Lake</strong><br/>St. Lawrence County, NY</Popup>
          </Marker>
          {trackingEnabled && <UserLocationMarker position={userLocation} accuracy={locationAccuracy} />}
          {trackingEnabled && <LocateButton position={userLocation} />}
        </MapContainer>

        <div className="absolute top-2 right-2 z-[800] pointer-events-none">
          <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} className="pointer-events-auto bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-md shadow-md border border-stone-200 dark:border-stone-700 p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>

        <div className="absolute right-0 top-0 bottom-0 z-[800] flex pointer-events-none">
          <div className="pointer-events-auto self-center -ml-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} aria-expanded={sidebarOpen} className="bg-white dark:bg-stone-900 rounded-l-md shadow-md border border-r-0 border-stone-200 dark:border-stone-700 p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors" title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
              <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
            </button>
          </div>
          {sidebarOpen && (
            <div role="region" aria-label="Map layers and controls" className="pointer-events-auto w-56 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm shadow-lg border-l border-stone-200 dark:border-stone-700 overflow-y-auto text-xs">
              {sidebarContent}
            </div>
          )}
        </div>

        {compact && isAdmin && (
          <div className="absolute top-2 left-2 z-[800]">
            <button onClick={() => { setIsAddingPin(!isAddingPin); setEditingPin(null); setNewPinLatLng(null); setPinForm({ label: '', type: 'cabin', description: '', cabin_id: '' }); setPinError('') }} aria-label={isAddingPin ? 'Cancel adding pin' : 'Add pin'} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 border transition-colors text-xs shadow-sm ${isAddingPin ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm text-rose-600 dark:text-rose-400 border-stone-300 dark:border-stone-600'}`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />{isAddingPin ? 'Cancel' : 'Add Pin'}
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
