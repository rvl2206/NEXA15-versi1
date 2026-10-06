/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['icon.png'],
        manifest: {
          short_name: 'NEXA15',
          name: 'NEXA15 - Presensi Digital SMAN 15 Ambon',
          icons: [
            {
              src: '/icon.png',
              type: 'image/png',
              sizes: '192x192'
            }
          ],
          start_url: '/',
          background_color: '#0f172a',
          theme_color: '#1e3a8a',
          display: 'standalone',
          orientation: 'portrait'
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [], // Explicitly DO NOT cache API requests
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10MB to cover the 4.96MB chunk
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: true,
    },
  };
});
