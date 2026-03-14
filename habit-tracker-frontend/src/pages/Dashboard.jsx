import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDashboard, useHabits, useToggleLog } from '../hooks/useHabits'
import { toApiDate } from '../utils/dateHelpers'
import AppLayout from '../components/layout/AppLayout'
import WeeklyChart from '../components/dashboard/WeeklyChart'

export default function Dashboard() {
  const { user }  = useAuth()
  const today     = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  const { data: stats,  isLoading: statsLoading  } = useDashboard()
  const { data: habits, isLoading: habitsLoading } = useHabits()

  return (
    <AppLayout>
      <div className="space-y-8" style={{ animation: 'slideUp .3s ease-out' }}>

        {/* Saludo */}
        <div>
          <h1 className="text-3xl text-stone-900">
            Hola, {user?.username} 👋
          </h1>
          <p className="text-stone-400 capitalize mt-1 text-sm">{today}</p>
        </div>

        {/* Tarjetas de stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon="✅"
            label="Completados hoy"
            value={statsLoading ? '…' : `${stats?.habitsCompletedToday ?? 0} / ${stats?.totalActiveHabits ?? 0}`}
            sub="hábitos"
            accent="amber"
          />
          <StatCard
            icon="🔥"
            label="Mejor racha activa"
            value={statsLoading ? '…' : `${stats?.bestCurrentStreak ?? 0}`}
            sub="días consecutivos"
            accent="orange"
          />
          <StatCard
            icon="📊"
            label="Cumplimiento semanal"
            value={statsLoading ? '…' : `${stats?.weeklyCompletionRate ?? 0}%`}
            sub="esta semana"
            accent="emerald"
          />
        </div>

        {/* Gráfico semanal */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl">Actividad semanal</h2>
            <span className="text-xs text-stone-400">% de hábitos completados por día</span>
          </div>
          {statsLoading
            ? <div className="h-48 bg-stone-50 rounded-xl animate-pulse" />
            : <WeeklyChart weeklyData={stats?.weeklyData ?? []} />
          }
        </div>

        {/* Hábitos de hoy */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Hoy</h2>
            <Link to="/habits" className="text-sm text-amber-600 hover:text-amber-700">
              Ver todos →
            </Link>
          </div>

          {habitsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="card animate-pulse h-16" />
              ))}
            </div>
          ) : !habits?.length ? (
            <div className="card text-center py-10">
              <p className="text-stone-400 mb-4">No tienes hábitos todavía</p>
              <Link to="/habits" className="btn-primary inline-flex">
                Crear un hábito
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {habits.map(habit => (
                <TodayHabitRow key={habit.id} habit={habit} />
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }) {
  const accents = {
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   sub: 'text-amber-500'   },
    orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  sub: 'text-orange-400'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-500' },
  }
  const c = accents[accent] || accents.amber

  return (
    <div className={`card ${c.bg} border-0`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${c.text}`}
         style={{ fontFamily: "'Playfair Display', serif" }}>
        {value}
      </p>
      <p className={`text-xs ${c.sub} mt-0.5`}>{sub}</p>
    </div>
  )
}

/**
 * Fila de hábito en la vista "Hoy".
 * Permite marcar/desmarcar directamente desde el dashboard.
 */
function TodayHabitRow({ habit }) {
  const toggleMutation = useToggleLog(habit.id)
  const todayStr = toApiDate(new Date())

  const handleToggle = () => {
    toggleMutation.mutate({ date: todayStr })
  }

  const freqLabels = { DAILY: 'Diario', WEEKLY: 'Semanal', CUSTOM: 'Personalizado' }

  return (
    <div className="card-hover flex items-center gap-4 py-3 cursor-pointer"
         onClick={handleToggle}>
      <div className="flex-1">
        <p className="text-sm font-medium text-stone-800">{habit.name}</p>
        <p className="text-xs text-stone-400">{freqLabels[habit.frequencyType]}</p>
      </div>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                        transition-all duration-200 flex-shrink-0
                        ${toggleMutation.isPending
                          ? 'border-stone-300 bg-stone-50'
                          : 'border-stone-300 hover:border-emerald-400'}`}>
        {toggleMutation.isPending
          ? <span className="spinner w-3 h-3 text-stone-400" />
          : null
        }
      </div>
    </div>
  )
}
