export const CRANBERRY_LAKE = [44.2228, -74.8344]
export const CHAIR_ROCK_ISLAND = [44.14722, -74.81194]
export const RADAR_API = 'https://api.rainviewer.com/public/weather-maps.json'
export const RADAR_TILES = 'https://tilecache.rainviewer.com/v2/radar'
export const ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const ESRI_TOPO = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
export const ESRI_ATTR = '&copy; <a href="https://www.esri.com/">Esri</a>'

export const PIN_COLORS = {
  cabin: '#10b981', boathouse: '#3b82f6', dock: '#06b6d4',
  'lean-to': '#d97706', firepit: '#ef4444', cell: '#8b5cf6', other: '#6b7280',
}

export const PIN_SVG = {
  cabin: '<path d="M8 1L1 7h2v7h10V7h2L8 1zM6 10h4v4H6z"/>',
  boathouse: '<path d="M8 1L1 7h1v5h12V7h1L8 1zM3 12h10v3H3z"/>',
  dock: '<path d="M4 10h8v2H4zM6 12v3h1v-3M9 12v3h1v-3"/>',
  'lean-to': '<path d="M3 12L8 4l5 8H3zM2 12h12v2H2z"/>',
  firepit: '<path d="M8 4C6 6 5 8 5 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0-2-1-4-3-6zM3 13h10v1H3z"/>',
  cell: '<path d="M4 12h1l2-3 2 4 2-2 1 1h4"/>',
  other: '<path d="M8 3C5.6 3 3.5 5.1 3.5 7.5c0 2.8 4.5 6.5 4.5 6.5s4.5-3.7 4.5-6.5C12.5 5.1 10.4 3 8 3zm0 3.5c.8 0 1.5.7 1.5 1.5S8.8 9.5 8 9.5 6.5 8.8 6.5 8 7.2 6.5 8 6.5z"/>',
}

export const GUIDE_SECTIONS = {
  solar: '/guide#solar-start', generator: '/guide#generator',
  water: '/guide#water', boats: '/guide#boats',
  battery: '/guide#battery-reset',
}

export const PIN_TYPE_LABELS = {
  cabin: 'Cabins', boathouse: 'Boathouse', dock: 'Docks',
  'lean-to': 'Lean-tos', firepit: 'Firepits', cell: 'Cell Service', other: 'Other',
}
