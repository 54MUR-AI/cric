import { useState, useEffect } from 'react'

const CRANBERRY_LAKE = { lat: 44.2228, lon: -74.8344 }

export function useWeatherStations() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const pointRes = await fetch(`https://api.weather.gov/points/${CRANBERRY_LAKE.lat},${CRANBERRY_LAKE.lon}`)
        if (!pointRes.ok) throw new Error('Failed to get grid point')
        const pointData = await pointRes.json()
        const { gridId, gridX, gridY } = pointData.properties

        const stationsRes = await fetch(`https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/stations`)
        if (!stationsRes.ok) throw new Error('Failed to get stations')
        const stationsData = await stationsRes.json()

        const stationList = stationsData.features.slice(0, 10)

        const withObs = await Promise.all(
          stationList.map(async (s) => {
            try {
              const obsRes = await fetch(`https://api.weather.gov/stations/${s.properties.stationIdentifier}/observations/latest`)
              if (!obsRes.ok) return { ...s.properties, observation: null }
              const obsData = await obsRes.json()
              return { ...s.properties, observation: obsData.properties }
            } catch {
              return { ...s.properties, observation: null }
            }
          })
        )

        if (!cancelled) {
          setStations(withObs.filter((s) => s.observation))
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return { stations, loading }
}
