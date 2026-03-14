import apiClient from './axiosConfig'

/**
 * API de hábitos.
 *
 * Estas funciones se usan como queryFn / mutationFn en React Query.
 * React Query maneja el caché, loading states y errores automáticamente.
 *
 * Convención de nombres:
 * - getXxx     → GET (queries)
 * - createXxx  → POST
 * - updateXxx  → PUT / PATCH
 * - deleteXxx  → DELETE
 * - toggleXxx  → POST de acción específica
 */
export const habitsApi = {

  // ── CRUD de hábitos ────────────────────────────────────────────────────────

  /** Obtener todos los hábitos activos del usuario */
  getHabits: async () => {
    const response = await apiClient.get('/habits')
    return response.data
  },

  /** Obtener un hábito por ID */
  getHabit: async (habitId) => {
    const response = await apiClient.get(`/habits/${habitId}`)
    return response.data
  },

  /**
   * Crear un nuevo hábito.
   * @param {Object} habitData - { name, description, frequencyType, weeklyDays?, customFrequencyDays? }
   */
  createHabit: async (habitData) => {
    const response = await apiClient.post('/habits', habitData)
    return response.data
  },

  /** Actualizar un hábito */
  updateHabit: async ({ habitId, data }) => {
    const response = await apiClient.put(`/habits/${habitId}`, data)
    return response.data
  },

  /** Archivar un hábito (soft delete: active = false) */
  archiveHabit: async (habitId) => {
    const response = await apiClient.patch(`/habits/${habitId}/archive`)
    return response.data
  },

  /** Eliminar definitivamente un hábito */
  deleteHabit: async (habitId) => {
    await apiClient.delete(`/habits/${habitId}`)
    return habitId  // necesario: onSuccess(_, deletedId) recibe el argumento original
  },

  // ── Logs (registros diarios) ────────────────────────────────────────────────

  /**
   * Obtener los logs de un hábito en un rango de fechas.
   * @param {number} habitId
   * @param {string} from - "2024-01-01"
   * @param {string} to   - "2024-01-31"
   */
  getHabitLogs: async ({ habitId, from, to }) => {
    const response = await apiClient.get(`/habits/${habitId}/logs`, {
      params: { from, to }
    })
    return response.data
  },

  /**
   * Marcar/desmarcar un día como completado.
   * Si ya existe un log COMPLETED para ese día, lo desmarca (→ PENDING).
   * Si no existe o está PENDING, lo marca como COMPLETED.
   * @param {Object} logData - { habitId, date: "2024-01-15", notes? }
   */
  toggleHabitLog: async ({ habitId, date, notes }) => {
    const response = await apiClient.post(`/habits/${habitId}/logs/toggle`, {
      date,
      notes
    })
    return response.data
  },

  // ── Estadísticas ────────────────────────────────────────────────────────────

  /**
   * Obtener estadísticas de un hábito:
   * { currentStreak, maxStreak, completionRateWeek, completionRateMonth, totalCompleted }
   */
  getHabitStats: async (habitId) => {
    const response = await apiClient.get(`/habits/${habitId}/stats`)
    return response.data
  },

  /**
   * Obtener estadísticas globales del usuario para el dashboard:
   * { habitsCompletedToday, totalActiveHabits, weeklyCompletionData: [...] }
   */
  getDashboardStats: async () => {
    const response = await apiClient.get('/habits/dashboard')
    return response.data
  },
}
