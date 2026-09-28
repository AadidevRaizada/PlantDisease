import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/plant-doctor/").
// HTTPS=1 enables a self-signed cert so phones on your Wi-Fi can use the camera.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    ...(process.env.HTTPS ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Plant Doctor',
        short_name: 'PlantDoc',
        description: 'Leaf disease detection for Maharashtra crops',
        theme_color: '#4f9a35',
        background_color: '#fdf3e1',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,onnx,wasm,jpg,woff2}'],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
      },
    }),
  ],
  optimizeDeps: { exclude: ['onnxruntime-web'] },
});
