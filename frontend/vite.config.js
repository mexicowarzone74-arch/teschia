import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // 🔒 DESACTIVAR SOURCE MAPS EN PRODUCCIÓN
    minify: 'terser', // Minificación agresiva
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar todos los console.log restantes
        drop_debugger: true // Eliminar debugger statements
      }
    },
    // Dividir chunks para mejor caching en Cloudflare
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          ui: ['@headlessui/react', '@heroicons/react', 'react-icons', 'react-toastify']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Escucha en todas las interfaces
    allowedHosts: [
      'localhost',
      'coordinacion-tescha.local',
      '.local' // Permite todos los dominios .local
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  // En producción, la URL de la API se inyecta vía VITE_API_URL
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || '')
  }
})
