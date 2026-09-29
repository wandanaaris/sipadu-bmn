import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { localMitraSqlitePlugin } from './local-api/vitePlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),localMitraSqlitePlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Vite mentransformasi modul satu per satu pada awal muat;
    // warmup membuat modul inti siap sebelum halaman dibuka.
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/finalTasks.ts', './src/dukmanTasks.ts'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Pisahkan vendor besar agar bundle utama ringan & cache browser efektif
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react') || id.includes('scheduler')) return 'react'
          }
        },
      },
    },
  },
})
