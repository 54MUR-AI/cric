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
  dismissAlert: (id: string) => void
  dismissLightning: () => void
  handleLightningStrike: (msg: string) => void
}

const WeatherAlertsContext = createContext<WeatherAlertsContextValue | null>(null)

const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?point=44.14722,-74.81194'
const UA = '(cric.app, denali.2.foxtrot@gmail.com)'
const POLL_INTERVAL = 300000

export function WeatherAlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([])
  const [lightningAlert, setLightningAlert] = useState<string | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const toast = useToast()
  const { isAdmin } = useAuth()

  useEffect(() => {
    let cancelled = false

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

    checkAlerts()
    const interval = setInterval(checkAlerts, POLL_INTERVAL)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const dismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]))
  }, [])

  const dismissLightning = useCallback(() => {
    setLightningAlert(null)
  }, [])

  const handleLightningStrike = useCallback((msg: string) => {
    setLightningAlert(msg)
    if (isAdmin) {
      sendPushToAll({ title: 'Lightning Nearby', body: msg, tag: 'lightning', data: { url: '/' } })
    }
  }, [isAdmin])

  const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id))

  return (
    <WeatherAlertsContext.Provider value={{ alerts, activeAlerts, lightningAlert, dismissAlert, dismissLightning, handleLightningStrike }}>
      {children}
    </WeatherAlertsContext.Provider>
  )
}

export function useWeatherAlerts(): WeatherAlertsContextValue {
  const ctx = useContext(WeatherAlertsContext)
  if (!ctx) throw new Error('useWeatherAlerts must be used within WeatherAlertsProvider')
  return ctx
}
