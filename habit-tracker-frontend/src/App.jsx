import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard    from './pages/Dashboard'
import HabitsPage   from './pages/HabitsPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
          <p className="text-stone-400 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login"    element={<PublicRoute><LoginPage    /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard  /></ProtectedRoute>} />
      <Route path="/habits"    element={<ProtectedRoute><HabitsPage /></ProtectedRoute>} />

      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center"
             style={{ background: 'var(--bg)' }}>
          <div className="text-center">
            <h1 className="text-7xl font-bold text-stone-100"
                style={{ fontFamily: 'Playfair Display, serif' }}>404</h1>
            <p className="text-stone-400 mt-2 text-sm">Página no encontrada</p>
            <a href="/dashboard" className="inline-block mt-6 btn-secondary text-sm">
              Volver al inicio
            </a>
          </div>
        </div>
      } />
    </Routes>
  )
}
