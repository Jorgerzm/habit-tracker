import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useHabitStats } from '../../hooks/useHabits'

/**
 * Muestra las estadísticas de un hábito individual:
 * - Racha actual y racha máxima
 * - % de cumplimiento semanal y mensual (barras de progreso)
 * - Total de días completados (histórico)
 *
 * Usa Recharts para las barras de progreso.
 */
export default function HabitStats({ habitId }) {
  const { data: stats, isLoading } = useHabitStats(habitId)

  if (isLoading) return <StatsSkeleton />
  if (!stats) return null

  const weekPct  = Math.round((stats.completionRateWeek  || 0) * 100)
  const monthPct = Math.round((stats.completionRateMonth || 0) * 100)

  const barData = [
    { label: 'Semana',  value: weekPct },
    { label: 'Mes',     value: monthPct },
  ]

  return (
    <div className="space-y-5">

      {/* Rachas */}
      <div className="grid grid-cols-2 gap-3">
        <StreakCard
          icon="🔥"
          label="Racha actual"
          value={stats.currentStreak}
          unit="días"
          color="amber"
        />
        <StreakCard
          icon="🏆"
          label="Racha máxima"
          value={stats.maxStreak}
          unit="días"
          color="emerald"
        />
      </div>

      {/* Gráfico de barras de cumplimiento */}
      <div>
        <p className="label mb-3">Cumplimiento</p>
        <div className="space-y-3">
          {barData.map(({ label, value }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-500">{label}</span>
                <span className="font-medium text-stone-700">{value}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${value}%`,
                    background: value >= 70
                      ? 'var(--success)'
                      : value >= 40
                        ? 'var(--accent)'
                        : '#ef4444'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total histórico */}
      <div className="flex items-center justify-between py-3 border-t"
           style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm text-stone-500">Total completado</span>
        <span className="text-lg font-semibold text-stone-800">
          {stats.totalCompleted}
          <span className="text-sm font-normal text-stone-400 ml-1">días</span>
        </span>
      </div>
    </div>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function StreakCard({ icon, label, value, unit, color }) {
  const bg      = color === 'amber'   ? 'bg-amber-50'   : 'bg-emerald-50'
  const textVal = color === 'amber'   ? 'text-amber-700' : 'text-emerald-700'
  const textLbl = color === 'amber'   ? 'text-amber-500' : 'text-emerald-500'

  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className="text-xl mb-0.5">{icon}</div>
      <div className={`text-2xl font-bold ${textVal}`} style={{ fontFamily: 'Playfair Display, serif' }}>
        {value}
      </div>
      <div className={`text-xs ${textLbl} mt-0.5`}>{label}</div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-xl bg-stone-100" />
        <div className="h-20 rounded-xl bg-stone-100" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-stone-100 rounded w-1/3" />
        <div className="h-2 bg-stone-100 rounded" />
        <div className="h-2 bg-stone-100 rounded" />
      </div>
    </div>
  )
}
