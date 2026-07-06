import { useMapEvents } from 'react-leaflet'

export default function MapClickHandler({ active, onMapClick, onMapClickGeneral }) {
  useMapEvents({ click(e) { if (active) onMapClick(e.latlng); else if (onMapClickGeneral) onMapClickGeneral(e.latlng) } })
  return null
}
