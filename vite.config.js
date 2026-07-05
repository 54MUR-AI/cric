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
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      workbox: {
        globPatterns: ['**/*.{js,css,svg,png,ico}'],
        navigationPreload: true,
      },
    }),
  ],
})
