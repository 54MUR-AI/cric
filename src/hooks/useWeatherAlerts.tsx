import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useToast } from '../components/ui/Toast'
import { useAuth } from './useAuth'
import { sendPushToAll } from './usePushNotifications'

interface WeatherAlert {
  id: string
  event: string
  headline: string
  severity: string
  urgency: string
}

interface WeatherAlertsContextValue {
  alerts: WeatherAlert[]
  activeAlerts: WeatherAlert[]
  lightningAlert: string | null
  precipitationAlert: string | null
  dismissAlert: (id: string) => void
  dismissLightning: () => void
  dismissPrecipitation: () => void
  handleLightningStrike: (msg: string) => void
  handlePrecipitation: (msg: string) => void
}

const WeatherAlertsContext = createContext<WeatherAlertsContextValue | null>(null)

const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?point=44.14722,-74.81194'
const UA = '(cric.app, denali.2.foxtrot@gmail.com)'
const POLL_INTERVAL = 300000
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast?latitude=44.14722&longitude=-74.81194&current=precipitation,weather_code'

export function WeatherAlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([])
  const [lightningAlert, setLightningAlert] = useState<string | null>(null)
  const [precipitationAlert, setPrecipitationAlert] = useState<string | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const toast = useToast()
  const { isAdmin } = useAuth()
  const isAdminRef = useRef(isAdmin)
  isAdminRef.current = isAdmin

  useEffect(() => {
    let cancelled = false
    let precipThrottle = 0

    async function checkAlerts() {
      try {
        const r = await fetch(NWS_ALERTS_URL, { headers: { 'User-Agent': UA } })
        if (!r.ok) return
        const data = await r.json()
        if (cancelled) return

        const warnings = (data.features || []).filter((f: any) => {
          const e = f.properties.event || ''
          return e.includes('Warning') || e.includes('Watch') || e === 'Severe Thunderstorm' || e.includes('Small Craft') || e.includes('Marine')
        })

        const mapped: WeatherAlert[] = warnings.map((w: any) => ({
          id: w.properties.id,
          event: w.properties.event,
          headline: (w.properties.headline || w.properties.description || '').slice(0, 150),
          severity: w.properties.severity || 'Unknown',
          urgency: w.properties.urgency || 'Unknown',
        }))

        setAlerts(mapped)
      } catch { /* ignore */ }
    }

    async function checkPrecipitation() {
      try {
        const r = await fetch(OPEN_METEO_URL)
        if (!r.ok || cancelled) return
        const data = await r.json()
        if (cancelled) return
        const current = data.current
        if (!current) return
        const code = current.weather_code
        const precip = current.precipitation ?? 0

        if (code >= 95 || precip >= 5) {
          if (Date.now() - precipThrottle > 300000) {
            precipThrottle = Date.now()
            setPrecipitationAlert('Heavy rain or thunderstorm detected — active weather nearby.')
            if (isAdminRef.current) sendPushToAll({ tag: 'precipitation' })
          }
        }
      } catch { /* ignore */ }
    }

    checkAlerts()
    checkPrecipitation()
    const nwsInterval = setInterval(checkAlerts, POLL_INTERVAL)
    const precipInterval = setInterval(checkPrecipitation, POLL_INTERVAL)
    return () => { cancelled = true; clearInterval(nwsInterval); clearInterval(precipInterval) }
  }, [])

  const prevPrecipitationRef = useRef(precipitationAlert)
  useEffect(() => {
    if (precipitationAlert && precipitationAlert !== prevPrecipitationRef.current) {
      toast.warning('Active weather detected', 8000)
      sendSystemNotification('Weather Alert', precipitationAlert)
    }
    prevPrecipitationRef.current = precipitationAlert
  }, [precipitationAlert, toast])

  const dismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]))
  }, [])

  const dismissLightning = useCallback(() => {
    setLightningAlert(null)
  }, [])

  const dismissPrecipitation = useCallback(() => {
    setPrecipitationAlert(null)
  }, [])

  const handleLightningStrike = useCallback((msg: string) => {
    setLightningAlert(msg)
    if (isAdmin) {
      sendPushToAll({ title: 'Lightning Nearby', body: msg, tag: 'lightning', data: { url: '/' } })
    }
  }, [isAdmin])

  const handlePrecipitation = useCallback((msg: string) => {
    setPrecipitationAlert(msg)
  }, [])

  const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id))

  return (
    <WeatherAlertsContext.Provider value={{ alerts, activeAlerts, lightningAlert, precipitationAlert, dismissAlert, dismissLightning, dismissPrecipitation, handleLightningStrike, handlePrecipitation }}>
      {children}
    </WeatherAlertsContext.Provider>
  )
}

export function useWeatherAlerts(): WeatherAlertsContextValue {
  const ctx = useContext(WeatherAlertsContext)
  if (!ctx) throw new Error('useWeatherAlerts must be used within WeatherAlertsProvider')
  return ctx
}
