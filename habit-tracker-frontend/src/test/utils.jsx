/**
 * src/test/utils.jsx
 *
 * Utilidades compartidas por todos los tests.
 *
 * ═══════════════════════════════════════════════════════════
 *  renderWithProviders
 * ═══════════════════════════════════════════════════════════
 *
 * Problema:
 *   Nuestros componentes necesitan varios Providers para funcionar:
 *   - QueryClientProvider  → para los hooks de React Query
 *   - BrowserRouter        → para <Link> y useNavigate
 *   - AuthProvider         → para useAuth()
 *
 *   Si usamos render(<HabitForm />) directamente, los hooks
 *   lanzarían "No QueryClient set" o similares.
 *
 * Solución:
 *   renderWithProviders() envuelve el componente en todos los
 *   providers necesarios automáticamente. Cada test recibe un
 *   QueryClient fresco para evitar contaminación entre tests.
 *
 * ═══════════════════════════════════════════════════════════
 *  Builders de datos de prueba
 * ═══════════════════════════════════════════════════════════
 *
 * Los builders crean objetos de datos con valores por defecto
 * sensatos, y permiten sobrescribir solo lo necesario:
 *
 *   buildHabit()                    → hábito diario por defecto
 *   buildHabit({ name: 'Correr' })  → diario con nombre personalizado
 *   buildHabit({ frequencyType: 'WEEKLY', weeklyDays: [1,3,5] })
 *
 * Esto evita repetir el mismo objeto enorme en cada test.
 */

import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

// ── Provider wrapper ────────────────────────────────────────────────────────

/**
 * Crea un QueryClient configurado para tests:
 * - retry: 0     → sin reintentos (los errores fallan rápido)
 * - gcTime: 0    → sin caché residual entre tests
 * - staleTime: 0 → siempre considera los datos obsoletos
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries:   { retry: 0, gcTime: 0, staleTime: 0 },
      mutations: { retry: 0 },
    },
    logger: {
      // Silenciar errores esperados en los tests de error
      log:   () => {},
      warn:  () => {},
      error: () => {},
    },
  })
}

/**
 * Usuario autenticado por defecto para los tests.
 * Los tests que necesiten un usuario diferente pueden sobreescribirlo.
 */
const DEFAULT_USER = {
  id:       1,
  username: 'testuser',
  email:    'test@example.com',
}

const DEFAULT_AUTH = {
  user:            DEFAULT_USER,
  token:           'mock.jwt.token',
  isAuthenticated: true,
  isLoading:       false,
  login:           () => Promise.resolve(),
  register:        () => Promise.resolve(),
  logout:          () => {},
}

/**
 * renderWithProviders(ui, options)
 *
 * @param {ReactElement} ui       - Componente a renderizar
 * @param {Object}       options
 *   @param {Object}  authValue   - Valor personalizado para el AuthContext
 *   @param {string}  initialRoute - Ruta inicial para MemoryRouter
 *   @param {QueryClient} queryClient - Cliente de React Query personalizado
 */
export function renderWithProviders(ui, {
  authValue    = DEFAULT_AUTH,
  initialRoute = '/',
  queryClient  = createTestQueryClient(),
} = {}) {
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={[initialRoute]}>
            {children}
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    )
  }

  const result = render(ui, { wrapper: Wrapper })
  return { ...result, queryClient }
}

// ── Builders de datos de test ────────────────────────────────────────────────

let habitIdCounter = 1

export function buildHabit(overrides = {}) {
  return {
    id:                   habitIdCounter++,
    name:                 'Meditar',
    description:          '10 minutos al día',
    frequencyType:        'DAILY',
    weeklyDays:           [],
    customFrequencyDays:  null,
    active:               true,
    createdAt:            '2024-01-01T00:00:00',
    ...overrides,
  }
}

export function buildHabitLog(overrides = {}) {
  return {
    id:     Math.floor(Math.random() * 1000),
    date:   new Date().toISOString().slice(0, 10),
    status: 'COMPLETED',
    notes:  null,
    ...overrides,
  }
}

export function buildStats(overrides = {}) {
  return {
    habitId:             1,
    habitName:           'Meditar',
    currentStreak:       5,
    maxStreak:           14,
    completionRateWeek:  0.85,
    completionRateMonth: 0.72,
    totalCompleted:      42,
    ...overrides,
  }
}

export function buildDashboardStats(overrides = {}) {
  const today = new Date()
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i + 1)
    return {
      date:      d.toISOString().slice(0, 10),
      dayLabel:  ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i],
      completed: i < 3 ? 3 : 0,
      total:     5,
    }
  })
  return {
    habitsCompletedToday: 3,
    totalActiveHabits:    5,
    bestCurrentStreak:    7,
    weeklyCompletionRate: 60,
    weeklyData,
    ...overrides,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Espera a que desaparezcan los spinners / "cargando" del DOM */
export async function waitForLoadingToFinish(screen) {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => {
    const spinners = screen.queryAllByRole('status')
    expect(spinners.length).toBe(0)
  }, { timeout: 2000 })
}
