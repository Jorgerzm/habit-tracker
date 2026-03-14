import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'

/**
 * AuthContext: gestiona el estado de autenticación globalmente.
 *
 * Responsabilidades:
 * - Almacenar el usuario actual y el token JWT.
 * - Persistir el token en localStorage para sobrevivir recargas.
 * - Exponer funciones de login, logout y registro.
 * - Indicar si la app está cargando (verificando token al inicio).
 *
 * Diseño:
 * - Al montar, lee el token de localStorage y verifica que sigue siendo válido
 *   llamando a /api/auth/me (así detectamos tokens expirados al recargar).
 * - useCallback en login/logout evita recrear las funciones en cada render.
 */
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('habittracker_token'))
  const [isLoading, setIsLoading] = useState(true)  // true mientras verificamos el token inicial

  // ── Al montar: verificar si el token guardado sigue siendo válido ──────────
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem('habittracker_token')
      if (!savedToken) {
        setIsLoading(false)
        return
      }

      try {
        const userData = await authApi.getMe(savedToken)
        setUser(userData)
        setToken(savedToken)
      } catch (error) {
        // Token expirado o inválido: limpiar
        localStorage.removeItem('habittracker_token')
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    verifyToken()
  }, [])

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const response = await authApi.login({ username, password })
    const { token: newToken, ...userData } = response

    localStorage.setItem('habittracker_token', newToken)
    setToken(newToken)
    setUser(userData)

    return userData
  }, [])

  // ── Registro ──────────────────────────────────────────────────────────────
  const register = useCallback(async (registerData) => {
    const response = await authApi.register(registerData)
    const { token: newToken, ...userData } = response

    localStorage.setItem('habittracker_token', newToken)
    setToken(newToken)
    setUser(userData)

    return userData
  }, [])

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('habittracker_token')
    setToken(null)
    setUser(null)
  }, [])

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook personalizado para consumir el AuthContext.
 * Lanza error si se usa fuera de AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return context
}
