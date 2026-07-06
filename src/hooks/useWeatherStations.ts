import { useState, useEffect, useRef } from 'react'
import db from '../lib/db'

interface StationObservation {
  stationIdentifier: string
  name: string
  latitude: number
  longitude: number
  observation: any
}

const CRANBERRY = 'https://api.weather.gov/points/44.2228,-74.8344'
const UA = '(cric.app, denali.2.foxtrot@gmail.com)'

export function useWeatherStations() {
  const [stations, setStations] = useState<StationObservation[]>([])
  const [loading, setLoading] = useState(true)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    async function fetchStations() {
      try {
        const cached = await db.weather_cache.where('key').equals('stations').first()
        if (cached?.data && Date.now() - cached.ts < 60000) {
          setStations(cached.data)
          setLoading(false)
          return
        }

        const gridRes = await fetch(CRANBERRY, { headers: { 'User-Agent': UA } })
        const grid = await gridRes.json()
        const stationsRes = await fetch(grid.properties.observationStations, { headers: { 'User-Agent': UA } })
        const stationsData = await stationsRes.json()
        const stationIds = stationsData.features.slice(0, 5).map((f: any) => f.properties.stationIdentifier)

        const withObs = await Promise.all(stationIds.map(async (id: string) => {
          try {
            const obsRes = await fetch(`https://api.weather.gov/stations/${id}/observations/latest`, { headers: { 'User-Agent': UA } })
            const obs = await obsRes.json()
            const props = obs.properties
            const geo = obs.geometry?.coordinates || []
            return {
              stationIdentifier: id,
              name: props.station?.properties?.name || id,
              latitude: geo[1],
              longitude: geo[0],
              observation: props,
            }
          } catch { return null }
        }))

        const result = withObs.filter(Boolean)
        if (!cancelledRef.current) {
          setStations(result)
          db.weather_cache.put({ key: 'stations', data: result, ts: Date.now() })
        }
      } catch {
        if (!cancelledRef.current) setStations([])
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    }

    fetchStations()
    const interval = setInterval(fetchStations, 300000)
    return () => { cancelledRef.current = true; clearInterval(interval) }
  }, [])

  return { stations, loading }
}
