import { useEffect } from 'react'
import { Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'

export default function UserLocationMarker({ position, accuracy }) {
  const map = useMap()
  useEffect(() => { if (position) map.flyTo(position, map.getZoom() < 13 ? 13 : map.getZoom(), { duration: 0.5 }) }, [position, map])
  if (!position) return null
  const accRadius = accuracy && accuracy < 1000 ? accuracy : 100
  return (
    <>
      <Circle center={position} radius={accRadius} pathOptions={{ color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.1, dashArray: '4' }} />
      <Marker position={position} icon={L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px rgba(59,130,246,0.5),0 2px 6px rgba(0,0,0,0.3);"><div style="width:8px;height:8px;background:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);animation:pulse 2s infinite;"></div></div><style>@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }</style>',
        iconSize: [18, 18], iconAnchor: [9, 9],
      })} />
    </>
  )
}
