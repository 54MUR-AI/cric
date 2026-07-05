importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js')

workbox.setConfig({ debug: false })

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new workbox.expiration.ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 86400 }),
      new workbox.precache.PrecacheFallbackPlugin({ fallbackURL: '/index.html' }),
    ],
  })
)

workbox.routing.registerRoute(
  /^https?:\/\/.*\/rest\/v1\/.*/i,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'supabase-api',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 })],
  })
)

workbox.routing.registerRoute(
  /^https?:\/\/api\.weather\.gov\/.*/i,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'weather-api',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 3600 })],
  })
)

workbox.routing.registerRoute(
  /^https?:\/\/server\.arcgisonline\.com\/.*/i,
  new workbox.strategies.CacheFirst({
    cacheName: 'esri-tiles',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 2000, maxAgeSeconds: 2592000 })],
  })
)

workbox.routing.registerRoute(
  /^https?:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
  new workbox.strategies.CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 2000, maxAgeSeconds: 2592000 })],
  })
)

workbox.routing.registerRoute(
  /^https?:\/\/tile\.waymarkedtrails\.org\/.*/i,
  new workbox.strategies.CacheFirst({
    cacheName: 'trails-tiles',
    plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 1000, maxAgeSeconds: 2592000 })],
  })
)

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
