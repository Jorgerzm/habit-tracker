import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Layout principal: navbar + contenido.
 * Todas las páginas protegidas lo usan para mantener consistencia.
 */
export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '◎' },
    { to: '/habits',    label: 'Mis hábitos', icon: '◈' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b"
              style={{ background: 'rgba(250,249,246,.92)', backdropFilter: 'blur(12px)',
                       borderColor: 'var(--border)' }}>
        <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-lg bg-amber-600 text-white
                             flex items-center justify-center text-sm font-bold
                             group-hover:bg-amber-700 transition-colors">H</span>
            <span className="font-medium text-stone-900 tracking-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}>
              HabitTracker
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon }) => {
              const active = location.pathname === to
              return (
                <Link key={to} to={to}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                  text-sm transition-all duration-150
                                  ${active
                                    ? 'bg-amber-50 text-amber-700 font-medium'
                                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                                  }`}>
                  <span className="text-xs">{icon}</span>
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Usuario */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 hidden sm:block">
              @{user?.username}
            </span>
            <button onClick={logout}
                    className="text-xs text-stone-500 hover:text-red-600
                               transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
              Salir
            </button>
          </div>
        </nav>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
