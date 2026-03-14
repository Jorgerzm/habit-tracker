import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },

  // ── Configuración de Vitest ───────────────────────────────────────────────
  test: {
    // jsdom simula el DOM del navegador en Node.js
    environment: 'jsdom',

    // Ejecutado antes de cada archivo de test:
    // carga @testing-library/jest-dom (matchers como toBeInTheDocument)
    setupFiles: ['./src/test/setup.js'],

    // Permite usar describe/test/expect sin importarlos en cada archivo
    globals: true,

    // Excluir node_modules de la cobertura
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        'src/main.jsx',
        '**/*.config.*',
      ],
    },
  },
})
