import { useMap } from 'react-leaflet'
import { Crosshair } from 'lucide-react'

export default function LocateButton({ position }) {
  const map = useMap()
  return (
    <div className="absolute top-2 left-2 z-[800] pointer-events-none">
      <button onClick={() => { if (position) map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.5 }) }} disabled={!position} className="pointer-events-auto bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-md shadow-md border border-stone-200 dark:border-stone-700 p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors disabled:opacity-40" title="Center on my location">
        <Crosshair className="h-4 w-4" />
      </button>
    </div>
  )
}
