import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    try {
      await login(data.username, data.password)
      toast.success('¡Bienvenido de vuelta! 👋')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Credenciales incorrectas')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Panel decorativo izquierdo (solo en pantallas grandes) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 60%, #3b2f1e 100%)' }}>
        <div className="text-center px-12 relative z-10">
          <div className="text-6xl mb-6">✦</div>
          <h2 className="text-4xl text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            La constancia<br/>es la clave
          </h2>
          <p className="text-stone-400 max-w-xs leading-relaxed">
            Cada pequeño paso cuenta. Registra tus hábitos y observa cómo se construye tu mejor versión.
          </p>
        </div>
        {/* Decoración de fondo */}
        <div className="absolute top-20 right-20 w-32 h-32 rounded-full opacity-10"
             style={{ background: 'var(--accent)' }} />
        <div className="absolute bottom-32 left-12 w-20 h-20 rounded-full opacity-5"
             style={{ background: 'var(--accent)' }} />
      </div>

      {/* Panel de formulario */}
      <div className="flex-1 flex items-center justify-center p-8 lg:max-w-md lg:min-w-96">
        <div className="w-full max-w-sm" style={{ animation: 'slideUp .3s ease-out' }}>

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-white
                             flex items-center justify-center font-bold text-sm">H</span>
            <span className="font-semibold text-stone-900" style={{ fontFamily: 'Playfair Display, serif' }}>
              HabitTracker
            </span>
          </div>

          <h1 className="text-3xl text-stone-900 mb-1">Iniciar sesión</h1>
          <p className="text-stone-400 text-sm mb-8">Bienvenido de vuelta</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="label">Usuario</label>
              <input type="text" autoComplete="username"
                     placeholder="tu_usuario"
                     className={`input-field ${errors.username ? 'input-error' : ''}`}
                     {...register('username', {
                       required: 'El usuario es obligatorio',
                       minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                     })} />
              {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input type="password" autoComplete="current-password"
                     placeholder="••••••••"
                     className={`input-field ${errors.password ? 'input-error' : ''}`}
                     {...register('password', {
                       required: 'La contraseña es obligatoria',
                       minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                     })} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
              {isSubmitting
                ? <><span className="spinner w-4 h-4" />Iniciando sesión...</>
                : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-stone-400 mt-8">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-amber-600 font-medium hover:text-amber-700">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
