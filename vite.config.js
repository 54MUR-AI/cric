import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'CRIC Manager',
        short_name: 'CRIC',
        description: 'Manage bookings, maintenance, and meetings for Chair Rock Island Corporation',
        theme_color: '#1a3c2e',
        background_color: '#f0f4f0',
        display: 'standalone',
        scope: process.env.VITE_BASE_URL || '/',
        start_url: process.env.VITE_BASE_URL || '/',
        icons: [
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,svg,png,ico}'],
        navigateFallback: null,
        navigationPreload: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              expiration: { maxEntries: 5, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/rest\/v1\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^https?:\/\/api\.weather\.gov\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-api',
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /^https?:\/\/server\.arcgisonline\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'esri-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 2592000 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 2592000 },
            },
          },
          {
            urlPattern: /^https?:\/\/tile\.waymarkedtrails\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'trails-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
    }),
  ],
})
