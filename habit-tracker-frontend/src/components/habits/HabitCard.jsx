import { useState } from 'react'
import { useDeleteHabit, useArchiveHabit } from '../../hooks/useHabits'
import HabitCalendar from './HabitCalendar'
import HabitStats from './HabitStats'
import HabitForm from './HabitForm'

const FREQ_LABELS = {
  DAILY:  { label: 'Diario',       cls: 'freq-tag--daily'  },
  WEEKLY: { label: 'Semanal',      cls: 'freq-tag--weekly' },
  CUSTOM: { label: 'Personalizado',cls: 'freq-tag--custom' },
}

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/**
 * Tarjeta de hábito.
 *
 * Estados:
 *   collapsed  → solo nombre, frecuencia y botones de acción
 *   expanded   → + calendario del mes + estadísticas
 *   editing    → modal de edición sobre la tarjeta
 *
 * El `activeTab` dentro de expanded alterna entre
 * 'calendar' y 'stats' para no colapsar la tarjeta.
 */
export default function HabitCard({ habit }) {
  const [expanded,  setExpanded]  = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [activeTab, setActiveTab] = useState('calendar')
  const [confirming, setConfirming] = useState(false)  // confirmación de borrado

  const deleteMutation  = useDeleteHabit()
  const archiveMutation = useArchiveHabit()

  const freqMeta = FREQ_LABELS[habit.frequencyType] || FREQ_LABELS.DAILY

  const freqDetail = habit.frequencyType === 'WEEKLY' && habit.weeklyDays?.length
    ? habit.weeklyDays.map(d => DAY_NAMES[d]).join(', ')
    : habit.frequencyType === 'CUSTOM'
      ? `Cada ${habit.customFrequencyDays} días`
      : null

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    await deleteMutation.mutateAsync(habit.id)
  }

  return (
    <>
      <div className={`card-hover transition-all duration-300 ${expanded ? 'shadow-md' : ''}`}>

        {/* ── Cabecera siempre visible ─────────────────────────────────── */}
        <div className="flex items-start gap-4">

          {/* Punto de color (podría ser personalizable en el futuro) */}
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />

          {/* Info del hábito */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-stone-900 truncate"
                  style={{ fontFamily: "'Playfair Display', serif" }}>
                {habit.name}
              </h3>
              <span className={`freq-tag ${freqMeta.cls}`}>
                {freqMeta.label}
              </span>
            </div>
            {habit.description && (
              <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">
                {habit.description}
              </p>
            )}
            {freqDetail && (
              <p className="text-xs text-stone-400 mt-0.5">{freqDetail}</p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="btn-ghost btn-icon text-stone-400 hover:text-stone-700"
              title="Editar">
              ✎
            </button>
            <button
              onClick={handleDelete}
              className={`btn-ghost btn-icon transition-colors
                          ${confirming
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-stone-400 hover:text-red-500'}`}
              title={confirming ? 'Click de nuevo para confirmar' : 'Eliminar'}>
              {confirming ? '⚠' : '⊗'}
            </button>
            {confirming && (
              <button
                onClick={() => setConfirming(false)}
                className="btn-ghost btn-icon text-stone-400 text-xs">
                ✕
              </button>
            )}
            <button
              onClick={() => { setExpanded(e => !e); setConfirming(false) }}
              className={`btn-ghost btn-icon text-stone-400 transition-transform duration-200
                          ${expanded ? 'rotate-180' : ''}`}
              title={expanded ? 'Colapsar' : 'Ver detalle'}>
              ⌄
            </button>
          </div>
        </div>

        {/* ── Contenido expandido ──────────────────────────────────────── */}
        {expanded && (
          <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl bg-stone-100 w-fit">
              {[
                { id: 'calendar', label: '📅 Calendario' },
                { id: 'stats',    label: '📊 Estadísticas' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                               ${activeTab === id
                                 ? 'bg-white text-stone-900 shadow-sm'
                                 : 'text-stone-500 hover:text-stone-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Contenido del tab */}
            {activeTab === 'calendar'
              ? <HabitCalendar habit={habit} />
              : <HabitStats    habitId={habit.id} />
            }
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {editing && (
        <HabitForm
          habit={habit}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
