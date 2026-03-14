import { useState, useMemo } from 'react'
import AppLayout from '../components/layout/AppLayout'
import HabitCard from '../components/habits/HabitCard'
import HabitForm from '../components/habits/HabitForm'
import { useHabits } from '../hooks/useHabits'

const FREQ_FILTER = [
  { value: 'ALL',    label: 'Todos' },
  { value: 'DAILY',  label: 'Diarios' },
  { value: 'WEEKLY', label: 'Semanales' },
  { value: 'CUSTOM', label: 'Personalizados' },
]

export default function HabitsPage() {
  const [showForm,   setShowForm]   = useState(false)
  const [search,     setSearch]     = useState('')
  const [freqFilter, setFreqFilter] = useState('ALL')

  const { data: habits = [], isLoading, isError, refetch } = useHabits()

  const filtered = useMemo(() => {
    let result = habits
    if (freqFilter !== 'ALL') result = result.filter(h => h.frequencyType === freqFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(h =>
        h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q)
      )
    }
    return result
  }, [habits, freqFilter, search])

  return (
    <AppLayout>
      <div className="space-y-6" style={{ animation: 'slideUp .3s ease-out' }}>

        {/* Encabezado */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl text-stone-900">Mis hábitos</h1>
            <p className="text-stone-500 mt-1 text-sm">
              {isLoading ? '...' : `${habits.length} hábito${habits.length !== 1 ? 's' : ''} activo${habits.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary flex-shrink-0">
            + Nuevo hábito
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">
              ⌕
            </span>
            <input type="text" placeholder="Buscar hábito..." value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="input-field pl-8" />
          </div>
          <div className="flex gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
            {FREQ_FILTER.map(({ value, label }) => (
              <button key={value} onClick={() => setFreqFilter(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                   ${freqFilter === value
                                     ? 'bg-white text-stone-900 shadow-sm'
                                     : 'text-stone-500 hover:text-stone-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-stone-200 rounded w-1/3" />
                    <div className="h-3 bg-stone-100 rounded w-1/2" />
                  </div>
                  <div className="w-7 h-7 bg-stone-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">⚠</div>
            <p className="text-stone-500 mb-4">No se pudieron cargar los hábitos</p>
            <button onClick={refetch} className="btn-secondary mx-auto">Reintentar</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">{habits.length > 0 ? '🔍' : '🌱'}</div>
            <h3 className="text-xl text-stone-700 mb-2">
              {habits.length > 0 ? 'Sin resultados' : 'Aún no tienes hábitos'}
            </h3>
            <p className="text-stone-400 text-sm mb-6 max-w-xs mx-auto">
              {habits.length > 0
                ? 'Prueba con otro filtro o término de búsqueda.'
                : 'Crea tu primer hábito y empieza a construir tu mejor versión, un día a la vez.'}
            </p>
            {!habits.length && (
              <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
                Crear mi primer hábito
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(habit => <HabitCard key={habit.id} habit={habit} />)}
          </div>
        )}
      </div>

      {showForm && <HabitForm onClose={() => setShowForm(false)} />}
    </AppLayout>
  )
}
