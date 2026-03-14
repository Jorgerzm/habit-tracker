import axios from 'axios'

/**
 * Instancia de Axios configurada para HabitTracker.
 *
 * baseURL:
 *   - Dev:  '/api'  → el proxy de Vite lo redirige a localhost:8080/api
 *   - Prod: VITE_API_URL → la URL completa del backend en Railway
 *           Ej: https://habit-tracker-api.up.railway.app/api
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Interceptor de REQUEST: añadir JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('habittracker_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de RESPONSE: manejar 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('habittracker_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
