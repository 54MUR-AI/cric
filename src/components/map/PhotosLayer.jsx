import { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

export default function PhotosLayer({ photos }) {
  const geotagged = useMemo(() => photos.filter(p => p.latitude != null && p.longitude != null), [photos])
  if (geotagged.length === 0) return null
  return geotagged.map(photo => (
    <Marker key={photo.id} position={[photo.latitude, photo.longitude]} icon={L.divIcon({
      className: '',
      html: `<div style="width:32px;height:32px;border-radius:4px;overflow:hidden;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer;"><img src="${photo.url}" alt="" style="width:100%;height:100%;object-fit:cover;" /></div>`,
      iconSize: [32, 32], iconAnchor: [16, 16],
    })}>
      <Popup>
        <div className="text-xs max-w-[200px]">
          <img src={photo.url} alt="" className="w-full h-24 object-cover rounded mb-1" />
          {photo.caption && <div className="text-stone-700 dark:text-stone-300 font-medium">{photo.caption}</div>}
          {photo.taken_at && <div className="text-stone-400 dark:text-stone-500">{new Date(photo.taken_at).toLocaleDateString()}</div>}
        </div>
      </Popup>
    </Marker>
  ))
}
