import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { habitsApi } from '../api/habits'
import { toApiDate, getCurrentMonthRange } from '../utils/dateHelpers'

/**
 * Hooks de React Query para hábitos.
 *
 * Patrón de organización:
 *   - useHabits()      → lista de hábitos activos
 *   - useHabit(id)     → hábito individual
 *   - useHabitLogs()   → logs en rango de fechas
 *   - useHabitStats()  → rachas y porcentajes
 *   - useDashboard()   → stats del dashboard
 *   - useCreateHabit() → mutación crear
 *   - useUpdateHabit() → mutación editar
 *   - useDeleteHabit() → mutación eliminar
 *   - useToggleLog()   → mutación marcar/desmarcar
 *
 * Cada mutación invalida las queries relacionadas automáticamente.
 * Así el UI siempre muestra datos frescos sin refetch manual.
 */

// ── Query Keys (centralizados para invalidación consistente) ─────────────────
export const habitKeys = {
  all:        ['habits'],
  lists:      () => [...habitKeys.all, 'list'],
  detail:     (id) => [...habitKeys.all, 'detail', id],
  logs:       (id, from, to) => [...habitKeys.all, 'logs', id, from, to],
  stats:      (id) => [...habitKeys.all, 'stats', id],
  dashboard:  ['dashboard-stats'],
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useHabits() {
  return useQuery({
    queryKey: habitKeys.lists(),
    queryFn:  habitsApi.getHabits,
  })
}

export function useHabit(habitId) {
  return useQuery({
    queryKey: habitKeys.detail(habitId),
    queryFn:  () => habitsApi.getHabit(habitId),
    enabled:  !!habitId,
  })
}

export function useHabitLogs(habitId, from, to) {
  return useQuery({
    queryKey: habitKeys.logs(habitId, from, to),
    queryFn:  () => habitsApi.getHabitLogs({ habitId, from, to }),
    enabled:  !!habitId && !!from && !!to,
  })
}

export function useHabitStats(habitId) {
  return useQuery({
    queryKey: habitKeys.stats(habitId),
    queryFn:  () => habitsApi.getHabitStats(habitId),
    enabled:  !!habitId,
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: habitKeys.dashboard,
    queryFn:  habitsApi.getDashboardStats,
  })
}

// ── Mutaciones ───────────────────────────────────────────────────────────────

export function useCreateHabit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: habitsApi.createHabit,
    onSuccess: (newHabit) => {
      // Añadir el nuevo hábito al caché de la lista sin refetch
      queryClient.setQueryData(habitKeys.lists(), (old = []) => [...old, newHabit])
      // Invalidar el dashboard (totalActiveHabits puede cambiar)
      queryClient.invalidateQueries({ queryKey: habitKeys.dashboard })
      toast.success(`"${newHabit.name}" creado 🎉`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear el hábito')
    },
  })
}

export function useUpdateHabit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: habitsApi.updateHabit,
    onSuccess: (updated) => {
      // Actualizar en caché directamente
      queryClient.setQueryData(habitKeys.lists(), (old = []) =>
        old.map(h => h.id === updated.id ? updated : h)
      )
      queryClient.setQueryData(habitKeys.detail(updated.id), updated)
      toast.success('Hábito actualizado')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar')
    },
  })
}

export function useDeleteHabit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: habitsApi.deleteHabit,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(habitKeys.lists(), (old = []) =>
        old.filter(h => h.id !== deletedId)
      )
      queryClient.invalidateQueries({ queryKey: habitKeys.dashboard })
      toast.success('Hábito eliminado')
    },
    onError: () => toast.error('Error al eliminar el hábito'),
  })
}

export function useArchiveHabit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: habitsApi.archiveHabit,
    onSuccess: (_, archivedId) => {
      queryClient.setQueryData(habitKeys.lists(), (old = []) =>
        old.filter(h => h.id !== archivedId)
      )
      queryClient.invalidateQueries({ queryKey: habitKeys.dashboard })
      toast.success('Hábito archivado')
    },
    onError: () => toast.error('Error al archivar el hábito'),
  })
}

export function useToggleLog(habitId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ date, notes }) =>
      habitsApi.toggleHabitLog({ habitId, date, notes }),
    onSuccess: (data) => {
      const { from, to } = getCurrentMonthRange()
      // Invalidar logs del mes actual para refrescar el calendario
      queryClient.invalidateQueries({ queryKey: habitKeys.logs(habitId, from, to) })
      // Invalidar stats del hábito (racha puede cambiar)
      queryClient.invalidateQueries({ queryKey: habitKeys.stats(habitId) })
      // Invalidar dashboard (completedToday puede cambiar)
      queryClient.invalidateQueries({ queryKey: habitKeys.dashboard })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'No se pudo registrar el hábito')
    },
  })
}
