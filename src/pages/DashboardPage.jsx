import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'
import { CloudSun, Thermometer, Wind, Droplets, AlertTriangle, Zap, X, Sunrise, Sunset, Camera } from 'lucide-react'
import LightboxDialog from '../components/ui/LightboxDialog'
import { useToast } from '../components/ui/Toast'
import { useWeatherAlerts } from '../hooks/useWeatherAlerts'
import MapPage from './MapPage'

const CRANBERRY_POINT = 'https://api.weather.gov/points/44.2228,-74.8344'
const AIRNOW_KEY = '043241C9-8A16-49B8-B754-AB9D7B84216C'
const UA = '(cric.app, denali.2.foxtrot@gmail.com)'

function getWeatherImage(desc, daytime) {
  const d = (desc || '').toLowerCase()
  if (d.includes('thunder') || d.includes('storm')) return '/images/weather/thunderstorm.jpg'
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return '/images/weather/rain.jpg'
  if (d.includes('snow') || d.includes('sleet') || d.includes('ice')) return '/images/weather/snow.jpg'
  if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return '/images/weather/fog.jpg'
  if (d.includes('cloud') || d.includes('overcast')) return daytime ? '/images/weather/cloudy-day.jpg' : '/images/weather/cloudy-night.jpg'
  return daytime ? '/images/weather/clear-day.jpg' : '/images/weather/clear-night.jpg'
}

function WeatherWidget() {
  const [current, setCurrent] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sunData, setSunData] = useState(null)
  const [aqi, setAqi] = useState(null)

  useEffect(() => {
    fetch(CRANBERRY_POINT, { headers: { 'User-Agent': UA } })
      .then(r => { if (!r.ok) throw new Error('Weather service unavailable'); return r.json() })
      .then(points => {
        Promise.all([
          fetch(points.properties.forecast, { headers: { 'User-Agent': UA } }).then(r => r.json()),
          fetch(points.properties.observationStations, { headers: { 'User-Agent': UA } }).then(r => r.json()),
        ]).then(([fc, st]) => {
          setForecast(fc.properties.periods.slice(0, 7))
          const ids = st.features.map(f => f.properties.stationIdentifier)
          ;async function findObs() {
            for (const sid of ids) {
              try {
                const r = await fetch(`https://api.weather.gov/stations/${sid}/observations/latest`, { headers: { 'User-Agent': UA } })
                const o = await r.json()
                if (o.properties?.temperature?.value != null) {
                  setCurrent(o.properties)
                  return
                }
              } catch {}
            }
          }
          findObs()
          setLoading(false)
        })
      })
      .catch(err => { setError(err.message); setLoading(false) })

    fetch('https://api.sunrise-sunset.org/json?lat=44.2228&lng=-74.8344&date=today&formatted=0')
      .then(r => r.json()).then(d => { if (d.status === 'OK') setSunData(d) }).catch(() => {})

    fetch(`https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=44.2228&longitude=-74.8344&distance=50&API_KEY=${AIRNOW_KEY}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          const worst = d.reduce((a, b) => (a.AQI || 0) > (b.AQI || 0) ? a : b)
          setAqi({ value: worst.AQI, category: worst.Category, pollutant: worst.ParameterName })
        }
      }).catch(() => {})
  }, [])

  if (loading) return (
    <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm border border-stone-200 dark:border-stone-700 animate-pulse">
      <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/4 mb-4" />
      <div className="flex gap-4">
        <div className="h-12 w-12 bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/2" />
          <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/3" />
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm border border-stone-200 dark:border-stone-700">
      <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2">
        <CloudSun className="h-4 w-4" /> Cranberry Lake, NY
      </h2>
      <p className="text-sm text-stone-400 dark:text-stone-500">Weather unavailable. {error}</p>
    </div>
  )

  const daytime = sunData
    ? Date.now() > new Date(sunData.results.sunrise).getTime() && Date.now() < new Date(sunData.results.sunset).getTime()
    : true
  const bgImg = getWeatherImage(current?.textDescription, daytime)

  return (
    <div className="rounded-lg shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700 relative overflow-hidden"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url(${bgImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="p-4">
        <h2 className="font-semibold text-white/90 mb-3 flex items-center gap-2">
          <CloudSun className="h-4 w-4" /> Cranberry Lake, NY
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {current && (
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-white">{current.temperature?.value != null ? `${Math.round(current.temperature.value * 9 / 5 + 32)}°F` : '--'}</div>
              <div className="text-sm text-white/80 space-y-1">
                <p className="text-white/90 font-medium">{current.textDescription || '--'}</p>
                {current.windSpeed?.value != null && <p className="flex items-center gap-1"><Wind className="h-3 w-3" />{Math.round(current.windSpeed.value * 0.621371)} mph</p>}
                {current.relativeHumidity?.value != null && <p className="flex items-center gap-1"><Droplets className="h-3 w-3" />{Math.round(current.relativeHumidity.value)}%</p>}
                {aqi && <p className="flex items-center gap-1.5 mt-1"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  aqi.value <= 50 ? 'bg-emerald-600/60 text-emerald-100' :
                  aqi.value <= 100 ? 'bg-yellow-500/60 text-yellow-100' :
                  aqi.value <= 150 ? 'bg-orange-500/60 text-orange-100' :
                  aqi.value <= 200 ? 'bg-red-500/60 text-red-100' :
                  'bg-rose-800/60 text-rose-100'
                }`}>AQI {aqi.value}</span><span className="text-white/70 text-[11px]">{aqi.category.Name} · {aqi.pollutant}</span></p>}
              </div>
            </div>
          )}
          {forecast && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {forecast.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[64px] text-center">
                  <span className="text-[10px] text-white/60 font-medium leading-tight">{p.name.replace('Night', '').replace('Evening', '').trim()}</span>
                  <Thermometer className={`h-4 w-4 ${p.temperature > 70 ? 'text-amber-300' : p.temperature > 50 ? 'text-white/70' : 'text-blue-300'}`} />
                  <span className="text-sm font-bold text-white/90">{p.temperature}°</span>
                  <span className="text-[9px] text-white/60 leading-tight">{p.shortForecast}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {sunData && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <Sunrise className="h-3 w-3" />
              {new Date(sunData.results.sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1">
              <Sunset className="h-3 w-3" />
              {new Date(sunData.results.sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="text-white/20">|</span>
          <span>{Math.floor(Number(sunData.results.day_length) / 3600)}h {String(Math.floor(Number(sunData.results.day_length) % 3600 / 60)).padStart(2, '0')}m daylight</span>
        </div>
      )}
      <p className="text-[10px] text-white/30 mt-2 text-right">Photos from Unsplash</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth()
  const toast = useToast()
  const { activeAlerts, lightningAlert, dismissAlert, dismissLightning, handleLightningStrike } = useWeatherAlerts()
  const [openTasks, setOpenTasks] = useState([])
  const [nextMeeting, setNextMeeting] = useState(null)
  const [recentPhotos, setRecentPhotos] = useState([])
  const [lightboxPhoto, setLightboxPhoto] = useState(null)
  const [activeOccupants, setActiveOccupants] = useState([])

  const triggerTestAlert = () => {
    toast.warning('TEST: Severe Thunderstorm Warning for St. Lawrence County', 8000)
    if (Notification.permission === 'granted') {
      try { new Notification('TEST: Severe Thunderstorm Warning', { body: 'Test notification - you should see this as a system notification.', icon: '/images/icon-192.png' }) } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    supabase.from('maintenance_tasks').select('*, maintenance_categories(name)').in('status', ['todo', 'in_progress']).order('due_date').limit(5).then(({ data }) => setOpenTasks(data || []))
    supabase.from('meetings').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(1).then(({ data }) => setNextMeeting(data?.[0] || null))
    supabase.from('photos').select('id, url, thumbnail_url, caption').order('created_at', { ascending: false }).limit(8).then(({ data }) => setRecentPhotos(data || []))
    const today = new Date().toISOString().split('T')[0]
    supabase.from('bookings').select('*, cabins(name, color, sort_order), profiles(display_name)').lte('start_date', today).gte('end_date', today).then(({ data }) => setActiveOccupants(data || []))
  }, [])

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {(activeAlerts.length > 0 || lightningAlert) && (
        <div className="space-y-2">
          {lightningAlert && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 p-3 flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Lightning Nearby</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">{lightningAlert}</p>
              </div>
              <button onClick={dismissLightning} className="shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"><X className="h-4 w-4" /></button>
            </div>
          )}
          {activeAlerts.map(a => (
            <div key={a.id} className={`rounded-lg border p-3 flex items-start gap-3 ${
              a.event.includes('Warning') || a.urgency === 'Immediate'
                ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-800'
                : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800'
            }`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                a.event.includes('Warning') || a.urgency === 'Immediate'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${
                  a.event.includes('Warning') || a.urgency === 'Immediate'
                    ? 'text-rose-800 dark:text-rose-300'
                    : 'text-amber-800 dark:text-amber-300'
                }`}>{a.event}</p>
                <p className={`text-xs ${
                  a.event.includes('Warning') || a.urgency === 'Immediate'
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}>{a.headline}</p>
              </div>
              <button onClick={() => dismissAlert(a.id)} className={`shrink-0 ${
                a.event.includes('Warning') || a.urgency === 'Immediate'
                  ? 'text-rose-500 hover:text-rose-700 dark:hover:text-rose-300'
                  : 'text-amber-500 hover:text-amber-700 dark:hover:text-amber-300'
              }`}><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}
        {isAdmin && <button onClick={triggerTestAlert} className="ml-3 align-middle text-[10px] font-normal text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 border border-stone-300 dark:border-stone-600 rounded px-2 py-0.5" title="Trigger test notification alerts">Test Alerts</button>}
      </h1>

      <WeatherWidget />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700">
          <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3">Who&rsquo;s Here This Week</h2>
          {activeOccupants.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-stone-500">Island is quiet &mdash; be the first to book!</p>
          ) : (
            <ul className="space-y-2">
              {[...activeOccupants].sort((a, b) => (a.cabins?.sort_order ?? 99) - (b.cabins?.sort_order ?? 99)).map((b) => (
                <li key={b.id} className="text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.cabins?.color || '#888' }} />
                  <span className="text-stone-600 dark:text-stone-400 truncate">
                    {b.cabins?.name}{b.room ? ` (${b.room})` : ''}
                  </span>
                  <span className="ml-auto text-stone-400 dark:text-stone-500 truncate text-[11px]">
                    {b.guests || b.profiles?.display_name || 'Booked'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/schedule" className="mt-3 inline-block text-sm text-emerald-700 dark:text-emerald-400 hover:underline">View schedule →</Link>
        </div>

        <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700">
          <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3">Open Tasks</h2>
          {openTasks.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-stone-500">No open tasks</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((t) => (
                <li key={t.id} className="text-sm flex justify-between">
                  <span className="text-stone-600 dark:text-stone-400 truncate">{t.title}</span>
                  <span className="text-stone-400 dark:text-stone-500">{t.maintenance_categories?.name}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/maintenance" className="mt-3 inline-block text-sm text-emerald-700 dark:text-emerald-400 hover:underline">View all tasks →</Link>
        </div>

        <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700">
          <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3">Next Meeting</h2>
          {nextMeeting ? (
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{nextMeeting.title}</p>
              <p className="text-sm text-stone-400 dark:text-stone-500">{formatDate(nextMeeting.date)}</p>
              <Link to="/meetings" className="mt-3 inline-block text-sm text-emerald-700 dark:text-emerald-400 hover:underline">View meetings →</Link>
            </div>
          ) : (
            <p className="text-sm text-stone-400 dark:text-stone-500">No upcoming meetings</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-3">Cranberry Lake Map</h2>
        <MapPage compact onLightningStrike={handleLightningStrike} />
      </div>

      {recentPhotos.length > 0 && (
        <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700">
          <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2"><Camera className="h-4 w-4" /> Recent Photos</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recentPhotos.map((p) => (
              <button key={p.id} onClick={() => setLightboxPhoto(p)} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 hover:ring-2 hover:ring-emerald-500 dark:hover:ring-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all">
                <img src={p.thumbnail_url || p.url} alt={p.caption || ''} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {lightboxPhoto && (
        <LightboxDialog
          photo={lightboxPhoto}
          photos={recentPhotos}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={setLightboxPhoto}
        />
      )}
    </div>
  )
}
