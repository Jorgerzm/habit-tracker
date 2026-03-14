import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const password = watch('password')

  const onSubmit = async (data) => {
    try {
      await registerUser({ username: data.username, email: data.email, password: data.password })
      toast.success('¡Cuenta creada! Bienvenido a HabitTracker 🎉')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear la cuenta')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8"
         style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm" style={{ animation: 'slideUp .3s ease-out' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <span className="w-8 h-8 rounded-xl bg-amber-600 text-white
                           flex items-center justify-center font-bold text-sm">H</span>
          <span className="font-semibold text-stone-900" style={{ fontFamily: 'Playfair Display, serif' }}>
            HabitTracker
          </span>
        </div>

        <h1 className="text-3xl text-stone-900 mb-1">Crear cuenta</h1>
        <p className="text-stone-400 text-sm mb-8">Empieza gratis, sin tarjeta</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

          <div>
            <label className="label">Usuario</label>
            <input type="text" placeholder="mi_usuario"
                   className={`input-field ${errors.username ? 'input-error' : ''}`}
                   {...register('username', {
                     required: 'El usuario es obligatorio',
                     minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                     maxLength: { value: 50, message: 'Máximo 50 caracteres' },
                     pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Solo letras, números y _' }
                   })} />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" placeholder="tu@email.com"
                   className={`input-field ${errors.email ? 'input-error' : ''}`}
                   {...register('email', {
                     required: 'El email es obligatorio',
                     pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email no válido' }
                   })} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Contraseña</label>
            <input type="password" placeholder="Mínimo 6 caracteres"
                   className={`input-field ${errors.password ? 'input-error' : ''}`}
                   {...register('password', {
                     required: 'La contraseña es obligatoria',
                     minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                   })} />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label className="label">Confirmar contraseña</label>
            <input type="password" placeholder="Repite tu contraseña"
                   className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
                   {...register('confirmPassword', {
                     required: 'Confirma tu contraseña',
                     validate: v => v === password || 'Las contraseñas no coinciden'
                   })} />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
            {isSubmitting
              ? <><span className="spinner w-4 h-4" />Creando cuenta...</>
              : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-400 mt-8">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-amber-600 font-medium hover:text-amber-700">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
