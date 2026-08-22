import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base は相対パスにしておくと GitHub Pages のサブディレクトリでもそのまま動く
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'VERTIGO ─ めまい診療の書',
        short_name: 'VERTIGO',
        description: '研修医向け めまい診断トレーニング',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000033',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,gif,woff2}'],
        globIgnores: [
          // v1 のマスター画像。src/ からの参照は無いのに 9.5MB を precache していた
          '**/vertigo-maneuvers/**',
          '**/vertigo-maneuvers-v2/**',
          '**/vertigo-maneuvers-v3/**',
          '**/vertigo-maneuvers-v3/sources/**',
          '**/vertigo-maneuvers-v3/**/frames/**',
          '**/vertigo-maneuvers-v3/**/review/**',
          '**/vertigo-maneuvers-v3/shared/*-master.png',
          '**/vertigo-maneuvers-v4/**',
          '**/vertigo-maneuvers-v5/**',
          '**/vertigo-maneuvers-v6-prototype/**',
          '**/vertigo-maneuvers-v7-rig/**',
          '**/DixHallpikeRigPrototype-*.*',
          '**/ManeuverRigPrototype-*.*',
          '**/PoseExportRoute-*.*',
        ],
      },
    }),
  ],
})
