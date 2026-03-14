import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         startOfWeek, endOfWeek, isToday, isFuture, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { toApiDate } from '../../utils/dateHelpers'
import { useHabitLogs, useToggleLog } from '../../hooks/useHabits'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * Calendario mensual de un hábito.
 *
 * Muestra una cuadrícula con los 7 días de la semana.
 * Cada celda representa un día: verde=completado, gris=pendiente,
 * vacío=fuera del mes. Al hacer clic en un día pasado o de hoy
 * se llama a toggleHabitLog para marcar/desmarcar.
 *
 * Navega entre meses con las flechas ← →.
 */
export default function HabitCalendar({ habit }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const from = toApiDate(startOfMonth(currentDate))
  const to   = toApiDate(endOfMonth(currentDate))

  const { data: logs = [], isLoading } = useHabitLogs(habit.id, from, to)
  const toggleMutation = useToggleLog(habit.id)

  // Indexar logs por fecha para búsqueda O(1)
  const logsByDate = useMemo(() => {
    const map = {}
    logs.forEach(log => { map[log.date] = log })
    return map
  }, [logs])

  // Generar cuadrícula: desde el lunes de la semana del primer día
  // hasta el domingo de la semana del último día
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd   = endOfMonth(currentDate)
    const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentDate])

  const handleDayClick = (day) => {
    if (isFuture(day) && !isToday(day)) return
    if (!isSameMonth(day, currentDate)) return
    toggleMutation.mutate({ date: toApiDate(day) })
  }

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const isCurrentMonth = isSameMonth(currentDate, new Date())

  return (
    <div className="space-y-3">

      {/* Cabecera del mes */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </span>
        <div className="flex gap-1">
          <button onClick={prevMonth}
                  className="btn-ghost btn-icon text-stone-500 hover:text-stone-800 w-7 h-7 p-0">
            ‹
          </button>
          <button onClick={nextMonth}
                  disabled={isCurrentMonth}
                  className="btn-ghost btn-icon text-stone-500 hover:text-stone-800 w-7 h-7 p-0
                             disabled:opacity-30 disabled:cursor-not-allowed">
            ›
          </button>
        </div>
      </div>

      {/* Etiquetas de días */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs text-stone-400 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Cuadrícula de días */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="w-9 h-9 rounded-lg bg-stone-100 animate-pulse mx-auto" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(day => {
            const dateStr   = toApiDate(day)
            const log       = logsByDate[dateStr]
            const inMonth   = isSameMonth(day, currentDate)
            const future    = isFuture(day) && !isToday(day)
            const today     = isToday(day)
            const completed = log?.status === 'COMPLETED'
            const isToggling = toggleMutation.isPending &&
                               toggleMutation.variables?.date === dateStr

            let cellClass = 'day-cell mx-auto '
            if (!inMonth)     cellClass += 'day-cell--empty opacity-0 pointer-events-none '
            else if (future)  cellClass += 'day-cell--future '
            else if (completed) cellClass += 'day-cell--completed '
            else              cellClass += 'day-cell--pending '

            if (today && inMonth) cellClass += 'day-cell--today '

            return (
              <button key={dateStr}
                      onClick={() => handleDayClick(day)}
                      disabled={future || !inMonth || isToggling}
                      className={cellClass + (isToggling ? 'animate-pop' : '')}
                      title={format(day, 'd MMM', { locale: es })}>
                {isToggling
                  ? <span className="spinner w-3 h-3" />
                  : <span>{format(day, 'd')}</span>
                }
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
