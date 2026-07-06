import { useEffect } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

export default function ForecastPopup({ latlng, data, loading, onClose }) {
  const map = useMap()
  useEffect(() => { if (latlng) map.flyTo([latlng.lat, latlng.lng], Math.max(map.getZoom(), 10), { duration: 0.5 }) }, [latlng, map])
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
