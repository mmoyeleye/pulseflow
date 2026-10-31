import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'GOPD Patient Flow',
        short_name: 'GOPD Queue',
        description: 'Patient check-in and queue management for GOPD',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Cache the app shell only. API responses are never cached, because queue data must be live.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webp}'],
        navigateFallback: '/index.html'
      },
      devOptions: { enabled: false }
    })
  ]
});