import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/admin/', // penting: SPA di-serve dari subfolder /admin oleh Laravel
  build: {
    outDir: '../public/admin', // build langsung ke public Laravel
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // saat development, request ke /api diteruskan ke Laravel (php artisan serve)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
