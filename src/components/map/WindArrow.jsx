import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'

export default function WindArrow({ speed, direction, lat, lon, name, temp }) {
  if (speed == null || direction == null) return null
  const speedMph = Math.round(speed * 1.15078)
  const size = Math.min(24 + speed * 2, 48)
  if (lat == null || lon == null || isNaN(Number(lat)) || isNaN(Number(lon))) return null
  const icon = L.divIcon({
    className: '',
    html: `<div style="position:relative;width:48px;height:56px;text-align:center"><div style="position:absolute;bottom:24px;left:50%;margin-left:-2px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:${size}px solid rgba(220,38,38,0.85);transform-origin:bottom center;transform:translateY(-4px) rotate(${direction}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></div><div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.95);border:1px solid #d1d5db;border-radius:6px;padding:1px 5px;font-size:10px;font-weight:600;color:#1f2937;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${temp != null ? `${Math.round(temp)}°F` : ''} ${speedMph}mph</div></div>`,
    iconSize: [48, 56], iconAnchor: [24, 28],
  })
  return <Marker position={[lat, lon]} icon={icon}><Popup><strong>{name}</strong><br/>{temp != null ? `${Math.round(temp)}°F` : ''}<br/>Wind: ${speedMph} mph ${Math.round(direction)}°</Popup></Marker>
}
