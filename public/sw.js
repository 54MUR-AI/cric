import { precacheAndRoute } from 'workbox-precaching'
import { ExpirationPlugin } from 'workbox-expiration'

const CACHE = 'cric-v2'
const PHOTO_CACHE = 'cric-photos-v1'
const MAP_CACHE = 'cric-map-v1'
const WEATHER_CACHE = 'cric-weather-v1'
const STATIC_EXT = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.ico', '.json']
const MAX_CACHE_ENTRIES = 200
const MAX_PHOTO_ENTRIES = 80

// Precache app shell (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![CACHE, PHOTO_CACHE, MAP_CACHE, WEATHER_CACHE].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

async function cacheFirst(request, cacheName, maxEntries) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, res.clone())
      if (maxEntries) {
        const keys = await cache.keys()
        if (keys.length > maxEntries) await cache.delete(keys[0])
      }
    }
    return res
  } catch {
    return Response.error()
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone())
    return res
  }).catch(() => cached)
  return cached || fetchPromise
}

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request)
    if (res.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, res.clone())
    }
    return res
  } catch {
    const cached = await caches.match(request)
    return cached || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never intercept non-GET (uploads/mutations)
  if (event.request.method !== 'GET') return

  // Cross-origin routing
  if (url.origin !== self.location.origin) {

    // Supabase storage images — CacheFirst (photos, cabin photos, pin photos)
    if (url.hostname.includes('supabase') && url.pathname.includes('/storage/')) {
      event.respondWith(cacheFirst(event.request, PHOTO_CACHE, MAX_PHOTO_ENTRIES))
      return
    }

    // Esri map tiles — StaleWhileRevalidate (satellite, topo)
    if (url.hostname.includes('arcgisonline.com') || url.hostname.includes('esri.com')) {
      event.respondWith(staleWhileRevalidate(event.request, MAP_CACHE))
      return
    }

    // OpenStreetMap / Waymarked Trails tiles — StaleWhileRevalidate
    if (url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('tile.waymarkedtrails.org')) {
      event.respondWith(staleWhileRevalidate(event.request, MAP_CACHE))
      return
    }

    // Weather.gov API — NetworkFirst (alerts, stations, forecast)
    if (url.hostname.includes('api.weather.gov')) {
      event.respondWith(networkFirst(event.request, WEATHER_CACHE))
      return
    }

    // Open-Meteo API — NetworkFirst
    if (url.hostname.includes('api.open-meteo.com')) {
      event.respondWith(networkFirst(event.request, WEATHER_CACHE))
      return
    }

    // RainViewer radar — StaleWhileRevalidate
    if (url.hostname.includes('rainviewer.com')) {
      event.respondWith(staleWhileRevalidate(event.request, MAP_CACHE))
      return
    }

    // Pi photo server, Supabase API, everything else — no cache
    event.respondWith(fetch(event.request).catch(() => Response.error()))
    return
  }

  // Same-origin below

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match('/index.html'))
    )
    return
  }

  if (STATIC_EXT.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(async res => {
          const clone = res.clone()
          const cache = await caches.open(CACHE)
          await cache.put(event.request, clone)
          const keys = await cache.keys()
          if (keys.length > MAX_CACHE_ENTRIES) {
            await cache.delete(keys[0])
          }
          return res
        })
      )
    )
    return
  }

  // Other same-origin GET — network only
  event.respondWith(fetch(event.request))
})

self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: event.data?.text() || 'CRIC Manager' }
  }

  const title = data.title || 'CRIC Manager'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const urlToOpen = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin + urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(urlToOpen)
    })
  )
})
