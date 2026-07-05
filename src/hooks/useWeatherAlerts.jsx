import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '../components/ui/Toast'
import { useAuth } from './useAuth'
import { sendPushToAll } from './usePushNotifications'

const WeatherAlertsContext = createContext(null)

const NWS_ALERTS_URL = 'https://api.weather.gov/alerts/active?point=44.14722,-74.81194'
const UA = '(cric.app, denali.2.foxtrot@gmail.com)'
const POLL_INTERVAL = 300000 // 5 minutes

export function WeatherAlertsProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [lightningAlert, setLightningAlert] = useState(null)
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set())
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

        const warnings = (data.features || []).filter(f => {
          const e = f.properties.event || ''
          return e.includes('Warning') || e.includes('Watch') || e === 'Severe Thunderstorm' || e.includes('Small Craft') || e.includes('Marine')
        })

        const mapped = warnings.map(w => ({
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

  const dismissAlert = useCallback((id) => {
    setDismissedAlerts(prev => new Set([...prev, id]))
  }, [])

  const dismissLightning = useCallback(() => {
    setLightningAlert(null)
  }, [])

  const handleLightningStrike = useCallback((msg) => {
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

export function useWeatherAlerts() {
  const ctx = useContext(WeatherAlertsContext)
  if (!ctx) throw new Error('useWeatherAlerts must be used within WeatherAlertsProvider')
  return ctx
}
