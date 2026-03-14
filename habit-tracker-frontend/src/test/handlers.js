/**
 * src/test/handlers.js
 *
 * Handlers de MSW (Mock Service Worker).
 *
 * ¿Qué es MSW?
 *   MSW intercepta peticiones HTTP a nivel de red (sin tocar el código
 *   de producción). Cuando un test llama a habitsApi.getHabits(),
 *   axios hace una petición real a /api/habits, MSW la intercepta
 *   y devuelve la respuesta definida aquí.
 *
 * Ventaja vs mock de axios:
 *   Con MSW testeamos el flujo completo: componente → hook → api client → red.
 *   Un mock de axios directo saltaría la capa de la API client (axiosConfig.js),
 *   que tiene lógica importante (interceptores, headers JWT).
 *
 * Estructura:
 *   handlers      → respuestas por defecto (happy path)
 *   errorHandlers → respuestas de error para tests negativos
 *
 * Los tests que necesiten comportamiento específico pueden
 * sobreescribir temporalmente un handler con server.use(handler).
 */

import { http, HttpResponse } from 'msw'

// ── Datos compartidos entre handlers ────────────────────────────────────────

import { buildHabit, buildHabitLog, buildStats, buildDashboardStats } from './utils.jsx'

const DEFAULT_HABITS = [
  buildHabit({ id: 1, name: 'Meditar',   frequencyType: 'DAILY'  }),
  buildHabit({ id: 2, name: 'Ejercicio', frequencyType: 'WEEKLY', weeklyDays: [1, 3, 5] }),
  buildHabit({ id: 3, name: 'Leer',      frequencyType: 'CUSTOM', customFrequencyDays: 2 }),
]

const today = new Date().toISOString().slice(0, 10)

// ── Handlers principales (happy path) ───────────────────────────────────────

export const handlers = [

  // Auth
  http.post('/api/auth/login', () =>
    HttpResponse.json({
      token:    'mock.jwt.token',
      id:       1,
      username: 'testuser',
      email:    'test@example.com',
    })
  ),

  http.post('/api/auth/register', () =>
    HttpResponse.json({
      token:    'mock.jwt.token.new',
      id:       2,
      username: 'newuser',
      email:    'new@example.com',
    }, { status: 201 })
  ),

  http.get('/api/auth/me', () =>
    HttpResponse.json({
      id:        1,
      username:  'testuser',
      email:     'test@example.com',
      createdAt: '2024-01-01T00:00:00',
    })
  ),

  // Hábitos
  http.get('/api/habits', () =>
    HttpResponse.json(DEFAULT_HABITS)
  ),

  http.get('/api/habits/:habitId', ({ params }) => {
    const habit = DEFAULT_HABITS.find(h => h.id === Number(params.habitId))
    return habit
      ? HttpResponse.json(habit)
      : new HttpResponse(null, { status: 404 })
  }),

  http.post('/api/habits', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      buildHabit({ id: 99, ...body }),
      { status: 201 }
    )
  }),

  http.put('/api/habits/:habitId', async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json(buildHabit({ id: Number(params.habitId), ...body }))
  }),

  http.patch('/api/habits/:habitId/archive', () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.delete('/api/habits/:habitId', () =>
    new HttpResponse(null, { status: 204 })
  ),

  // Logs
  http.get('/api/habits/:habitId/logs', () =>
    HttpResponse.json([
      buildHabitLog({ date: today,                          status: 'COMPLETED' }),
      buildHabitLog({ date: getPastDate(1),                 status: 'COMPLETED' }),
      buildHabitLog({ date: getPastDate(2),                 status: 'PENDING'   }),
      buildHabitLog({ date: getPastDate(3),                 status: 'COMPLETED' }),
    ])
  ),

  http.post('/api/habits/:habitId/logs/toggle', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      log: buildHabitLog({ date: body.date, status: 'COMPLETED' }),
      message: 'Hábito marcado como completado',
    })
  }),

  // Stats
  http.get('/api/habits/:habitId/stats', ({ params }) =>
    HttpResponse.json(buildStats({ habitId: Number(params.habitId) }))
  ),

  http.get('/api/habits/dashboard', () =>
    HttpResponse.json(buildDashboardStats())
  ),
]

// ── Handlers de error (para tests negativos) ────────────────────────────────

export const errorHandlers = {

  /** Toggle falla con "día pasado inmutable" */
  togglePastDay: http.post('/api/habits/:habitId/logs/toggle', () =>
    HttpResponse.json(
      { message: 'No se puede modificar el registro de un día pasado.' },
      { status: 400 }
    )
  ),

  /** Crear hábito falla con username duplicado */
  createHabitConflict: http.post('/api/habits', () =>
    HttpResponse.json(
      { message: 'Un hábito semanal requiere al menos un día de la semana.' },
      { status: 400 }
    )
  ),

  /** Login falla con credenciales incorrectas */
  loginUnauthorized: http.post('/api/auth/login', () =>
    HttpResponse.json(
      { message: 'Credenciales incorrectas' },
      { status: 401 }
    )
  ),

  /** Lista de hábitos vacía */
  emptyHabits: http.get('/api/habits', () =>
    HttpResponse.json([])
  ),

  /** Error de servidor */
  serverError: http.get('/api/habits', () =>
    new HttpResponse(null, { status: 500 })
  ),
}

// ── Helper ───────────────────────────────────────────────────────────────────

function getPastDate(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}
