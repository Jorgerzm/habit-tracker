import apiClient from './axiosConfig'

/**
 * API de autenticación.
 *
 * Nota: login y register devuelven { token, username, email, id }
 * tal como lo envía el AuthController del backend.
 */
export const authApi = {

  /** Login: devuelve { token, id, username, email } */
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials)
    return response.data
  },

  /** Registro: devuelve { token, id, username, email } */
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData)
    return response.data
  },

  /**
   * Obtener datos del usuario autenticado.
   * Se llama al iniciar la app para verificar si el token guardado sigue válido.
   * Acepta el token como parámetro (en lugar de leerlo de localStorage)
   * porque se llama antes de que el interceptor esté totalmente configurado.
   */
  getMe: async (token) => {
    const response = await apiClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },
}
