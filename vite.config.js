import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LPMT - Learner Progress Monitoring',
        short_name: 'LPMT',
        description: 'Offline-first literacy and numeracy monitoring',
        theme_color: '#1e3a8a',
        background_color: '#f3f4f6',
        display: 'standalone',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3426/3426651.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})