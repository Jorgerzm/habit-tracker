import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
         eachDayOfInterval, isToday, isPast, isFuture, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Utilidades de fechas para HabitTracker.
 *
 * Centralizar aquí el manejo de fechas evita inconsistencias
 * y facilita cambiar la librería (date-fns → dayjs) sin tocar componentes.
 *
 * Formato estándar de fecha para la API: "YYYY-MM-DD" (ISO 8601 date-only).
 */

/** Formatea una fecha como "YYYY-MM-DD" para enviar a la API. */
export const toApiDate = (date) => format(date, 'yyyy-MM-dd')

/** Parsea un string "YYYY-MM-DD" de la API a Date. */
export const fromApiDate = (dateString) => parseISO(dateString)

/** Etiqueta legible para el usuario: "lunes, 15 de enero". */
export const toDisplayDate = (date) =>
  format(date, "EEEE, d 'de' MMMM", { locale: es })

/** Etiqueta corta: "15 ene". */
export const toShortDate = (date) =>
  format(date, "d MMM", { locale: es })

/** Obtiene el rango de la semana actual (lunes-domingo). */
export const getCurrentWeekRange = () => {
  const now = new Date()
  return {
    from: toApiDate(startOfWeek(now, { weekStartsOn: 1 })),
    to:   toApiDate(endOfWeek(now, { weekStartsOn: 1 })),
  }
}

/** Obtiene el rango del mes actual. */
export const getCurrentMonthRange = () => {
  const now = new Date()
  return {
    from: toApiDate(startOfMonth(now)),
    to:   toApiDate(endOfMonth(now)),
  }
}

/** Genera todos los días de un mes dado (Date[]).  */
export const getDaysInMonth = (year, month) => {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return eachDayOfInterval({ start, end })
}

/** Clase CSS según el estado del día en el calendario de hábitos. */
export const getDayClass = (date, status) => {
  const base = 'habit-day'
  if (isFuture(date) && !isToday(date)) return `${base} habit-day--future`

  switch (status) {
    case 'COMPLETED': return `${base} habit-day--completed`
    case 'FAILED':    return `${base} habit-day--failed`
    case 'SKIPPED':   return `${base} habit-day--skipped`
    default:
      return `${base} ${isToday(date) ? 'habit-day--today' : 'habit-day--pending'}`
  }
}

export { isToday, isPast, isFuture }
