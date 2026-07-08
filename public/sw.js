const CACHE = 'cric-v2'
const STATIC_EXT = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.ico', '.json']

// Inject manifest placeholder
const ignored = self.__WB_MANIFEST

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.add('/index.html')).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never cache cross-origin requests (e.g. Supabase API / photo server)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }))
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match('/index.html'))
    )
    return
  }

  if (event.request.method === 'GET' && STATIC_EXT.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
          return res
        })
      )
    )
    return
  }

  event.respondWith(fetch(event.request, { cache: 'no-store' }))
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
