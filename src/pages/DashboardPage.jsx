import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'
import { CloudSun, Thermometer, Wind, Droplets, AlertTriangle, Zap, AlertOctagon, X } from 'lucide-react'
import MapPage from './MapPage'

const CRANBERRY_POINT = 'https://api.weather.gov/points/44.2228,-74.8344'
const UA = '(cric.app, denali.2.foxtrot@gmail.com)'

function WeatherWidget() {
  const [current, setCurrent] = useState(null)
  const [forecast, setForecast] = useState(null)

  useEffect(() => {
    fetch(CRANBERRY_POINT, { headers: { 'User-Agent': UA } })
      .then(r => r.json())
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
        })
      })
  }, [])

  return (
    <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700">
      <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-2">
        <CloudSun className="h-4 w-4" /> Cranberry Lake, NY
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {current && (
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-stone-800 dark:text-stone-200">{current.temperature?.value != null ? `${Math.round(current.temperature.value * 9 / 5 + 32)}°F` : '--'}</div>
            <div className="text-sm text-stone-500 dark:text-stone-400 space-y-1">
              <p className="text-stone-700 dark:text-stone-300 font-medium">{current.textDescription || '--'}</p>
              {current.windSpeed?.value != null && <p className="flex items-center gap-1"><Wind className="h-3 w-3" />{Math.round(current.windSpeed.value * 0.621371)} mph</p>}
              {current.relativeHumidity?.value != null && <p className="flex items-center gap-1"><Droplets className="h-3 w-3" />{Math.round(current.relativeHumidity.value)}%</p>}
            </div>
          </div>
        )}
        {forecast && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {forecast.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[64px] text-center">
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium leading-tight">{p.name.replace('Night', '').replace('Evening', '').trim()}</span>
                <Thermometer className={`h-4 w-4 ${p.temperature > 70 ? 'text-amber-500 dark:text-amber-400' : p.temperature > 50 ? 'text-stone-500 dark:text-stone-400' : 'text-blue-500 dark:text-blue-400'}`} />
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{p.temperature}°</span>
                <span className="text-[9px] text-stone-400 dark:text-stone-500 leading-tight">{p.shortForecast}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [upcomingBookings, setUpcomingBookings] = useState([])
  const [openTasks, setOpenTasks] = useState([])
  const [nextMeeting, setNextMeeting] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set())
  const [lightningAlert, setLightningAlert] = useState(null)

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
        setAlerts(warnings.map(w => ({
          id: w.properties.id,
          event: w.properties.event,
          headline: (w.properties.headline || w.properties.description || '').slice(0, 150),
          severity: w.properties.severity || 'Unknown',
          urgency: w.properties.urgency || 'Unknown',
        })))
      } catch { /* ignore */ }
    }
    checkAlerts()
    const interval = setInterval(checkAlerts, 300000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const dismissAlert = (id) => setDismissedAlerts(prev => new Set([...prev, id]))
  const dismissLightning = () => setLightningAlert(null)

  const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id))

  useEffect(() => {
    supabase.from('bookings').select('*, cabins(name)').gte('start_date', new Date().toISOString().split('T')[0]).order('start_date').limit(5).then(({ data }) => setUpcomingBookings(data || []))
    supabase.from('maintenance_tasks').select('*, maintenance_categories(name)').in('status', ['todo', 'in_progress']).order('due_date').limit(5).then(({ data }) => setOpenTasks(data || []))
    supabase.from('meetings').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(1).then(({ data }) => setNextMeeting(data?.[0] || null))
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

      <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}</h1>

      <WeatherWidget />

      <div>
        <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-3">Cranberry Lake Map</h2>
        <MapPage compact onLightningStrike={(msg) => setLightningAlert(msg)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white dark:bg-stone-900 p-4 shadow-sm dark:shadow-black/20 border border-stone-200 dark:border-stone-700">
          <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3">Upcoming Bookings</h2>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-stone-500">No upcoming bookings</p>
          ) : (
            <ul className="space-y-2">
              {upcomingBookings.map((b) => (
                <li key={b.id} className="text-sm flex justify-between group relative">
                  <span className="text-stone-600 dark:text-stone-400">{b.cabins?.name}</span>
                  <span className="text-stone-400 dark:text-stone-500">{formatDate(b.start_date)}</span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-800 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                      {formatDate(b.start_date)} – {formatDate(b.end_date)}{b.guests ? ` · ${b.guests}` : ''}
                    </div>
                  </div>
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
    </div>
  )
}
