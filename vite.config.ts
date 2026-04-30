import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias @/ → ./src sehingga import bersih: import Foo from '@/components/Foo'
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Forward semua request /api/* ke FastAPI backend
      // Saat development: axios base URL adalah '/api', proxy forward ke localhost:8000
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})