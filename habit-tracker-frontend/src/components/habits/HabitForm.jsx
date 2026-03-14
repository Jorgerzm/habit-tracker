import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useCreateHabit, useUpdateHabit } from '../../hooks/useHabits'

const DAYS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 7, label: 'D' },
]

const FREQ_OPTIONS = [
  { value: 'DAILY',  label: 'Diario',        icon: '☀', desc: 'Todos los días' },
  { value: 'WEEKLY', label: 'Semanal',        icon: '📅', desc: 'Días específicos' },
  { value: 'CUSTOM', label: 'Personalizado',  icon: '⚙', desc: 'Cada X días' },
]

/**
 * Formulario de creación/edición de hábito en modal.
 *
 * Props:
 *   habit?    → Si se pasa, es modo edición. Si no, creación.
 *   onClose() → Cierra el modal.
 *
 * React Hook Form gestiona el estado del formulario.
 * Los campos condicionales (weeklyDays, customFrequencyDays)
 * se muestran/ocultan según el frequencyType seleccionado.
 */
export default function HabitForm({ habit, onClose }) {
  const isEditing = !!habit
  const createMutation = useCreateHabit()
  const updateMutation = useUpdateHabit()

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      name:                 habit?.name        || '',
      description:          habit?.description || '',
      frequencyType:        habit?.frequencyType || 'DAILY',
      weeklyDays:           habit?.weeklyDays  || [],
      customFrequencyDays:  habit?.customFrequencyDays || 3,
    }
  })

  const frequencyType = watch('frequencyType')

  // Al cambiar el tipo, limpiar campos de otros tipos
  useEffect(() => {
    if (frequencyType === 'DAILY') {
      setValue('weeklyDays', [])
      setValue('customFrequencyDays', null)
    } else if (frequencyType === 'CUSTOM') {
      setValue('weeklyDays', [])
    } else if (frequencyType === 'WEEKLY') {
      setValue('customFrequencyDays', null)
    }
  }, [frequencyType, setValue])

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ habitId: habit.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onClose()
    } catch {
      // El error ya lo maneja la mutación con toast
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl">
            {isEditing ? 'Editar hábito' : 'Nuevo hábito'}
          </h2>
          <button onClick={onClose}
                  className="text-stone-400 hover:text-stone-600 transition-colors
                             w-8 h-8 flex items-center justify-center rounded-lg
                             hover:bg-stone-100 text-lg">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

          {/* Nombre */}
          <div>
            <label className="label">Nombre *</label>
            <input
              className={`input-field ${errors.name ? 'input-error' : ''}`}
              placeholder="Ej: Meditar 10 minutos"
              {...register('name', {
                required: 'El nombre es obligatorio',
                maxLength: { value: 100, message: 'Máximo 100 caracteres' }
              })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="label">Descripción</label>
            <textarea
              rows={2}
              className="input-field resize-none"
              placeholder="¿Por qué quieres este hábito?"
              {...register('description', {
                maxLength: { value: 500, message: 'Máximo 500 caracteres' }
              })}
            />
          </div>

          {/* Tipo de frecuencia — solo en creación */}
          {!isEditing && (
            <div>
              <label className="label">Frecuencia *</label>
              <div className="grid grid-cols-3 gap-2">
                {FREQ_OPTIONS.map(({ value, label, icon, desc }) => {
                  const selected = frequencyType === value
                  return (
                    <label key={value}
                           className={`flex flex-col items-center gap-1 p-3
                                       rounded-xl border-2 cursor-pointer
                                       transition-all duration-150
                                       ${selected
                                         ? 'border-amber-500 bg-amber-50'
                                         : 'border-stone-200 hover:border-stone-300'}`}>
                      <input type="radio" value={value}
                             className="sr-only"
                             {...register('frequencyType')} />
                      <span className="text-xl">{icon}</span>
                      <span className={`text-xs font-medium ${selected ? 'text-amber-700' : 'text-stone-700'}`}>
                        {label}
                      </span>
                      <span className="text-xs text-stone-400 text-center leading-tight">
                        {desc}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Días de la semana — solo para WEEKLY */}
          {frequencyType === 'WEEKLY' && (
            <div>
              <label className="label">Días de la semana *</label>
              <Controller
                name="weeklyDays"
                control={control}
                rules={{
                  validate: v => (v && v.length > 0) || 'Selecciona al menos un día'
                }}
                render={({ field }) => (
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map(({ value, label }) => {
                      const selected = field.value?.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? field.value.filter(d => d !== value)
                              : [...(field.value || []), value].sort((a,b) => a-b)
                            field.onChange(next)
                          }}
                          className={`w-10 h-10 rounded-xl text-sm font-medium
                                      border-2 transition-all duration-150
                                      ${selected
                                        ? 'bg-amber-600 text-white border-amber-600'
                                        : 'bg-white text-stone-600 border-stone-200 hover:border-amber-400'}`}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
              {errors.weeklyDays && (
                <p className="mt-1 text-xs text-red-500">{errors.weeklyDays.message}</p>
              )}
            </div>
          )}

          {/* Intervalo — solo para CUSTOM */}
          {frequencyType === 'CUSTOM' && (
            <div>
              <label className="label">Repetir cada</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={2}
                  max={365}
                  className={`input-field w-24 text-center ${errors.customFrequencyDays ? 'input-error' : ''}`}
                  {...register('customFrequencyDays', {
                    required: 'Obligatorio',
                    min: { value: 2, message: 'Mínimo 2 días' },
                    max: { value: 365, message: 'Máximo 365 días' },
                    valueAsNumber: true,
                  })}
                />
                <span className="text-stone-500 text-sm">días</span>
              </div>
              {errors.customFrequencyDays && (
                <p className="mt-1 text-xs text-red-500">{errors.customFrequencyDays.message}</p>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting
                ? <><span className="spinner w-4 h-4" /> Guardando...</>
                : isEditing ? 'Guardar cambios' : 'Crear hábito'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
