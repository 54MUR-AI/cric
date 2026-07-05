const CACHE = 'cric-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.add('/index.html')).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Inject manifest placeholder
const ignored = self.__WB_MANIFEST

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    )
    return
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
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
