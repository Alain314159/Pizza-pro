import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/Pizza-pro/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        id: '/Pizza-pro/',
        name: 'Pizza Pro',
        short_name: 'Pizza Pro',
        description: 'Gestion de pizzeria con recetas adaptativas',
        lang: 'es',
        theme_color: '#D97706',
        background_color: '#FEF3C7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Pizza-pro/',
        start_url: '/Pizza-pro/',
        categories: ['business', 'food', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Nueva Venta', short_name: 'Venta', url: '/Pizza-pro/#ventas', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Registrar Baja', short_name: 'Baja', url: '/Pizza-pro/#bajas', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Auditoria', short_name: 'Auditoria', url: '/Pizza-pro/#auditoria', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: { compress: { drop_console: true, drop_debugger: true } },
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue'],
          'chart-vendor': ['chart.js'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],
          'db-vendor': ['dexie']
        }
      }
    }
  }
});
