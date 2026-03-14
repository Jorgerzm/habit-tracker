import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

/**
 * Configuración de React Query:
 * - staleTime: 5 minutos → los datos se consideran frescos durante 5 min
 *   (no se refetchea en cada montaje del componente).
 * - retry: 1 → si falla una petición, reintenta 1 vez antes de mostrar error.
 * - refetchOnWindowFocus: false → no refetchear al volver a la pestaña
 *   (puede ser molesto durante el desarrollo).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,   // No reintentar mutaciones por defecto
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          {/* Toast notifications globales */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '8px',
                background: '#1e293b',
                color: '#f8fafc',
              },
              success: { duration: 2500 },
              error: { duration: 4000 },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
      {/* DevTools de React Query: solo visible en desarrollo */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
)
