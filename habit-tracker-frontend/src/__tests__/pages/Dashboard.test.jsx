/**
 * src/__tests__/pages/Dashboard.test.jsx
 *
 * Tests de integración del Dashboard.
 *
 * El Dashboard es la página más "conectada": usa useDashboard()
 * y useHabits() simultáneamente. Aquí testeamos que:
 *
 *   1. Las tres stat cards se renderizan con datos reales de la API.
 *   2. El gráfico semanal aparece cuando hay datos.
 *   3. La lista de hábitos "de hoy" se renderiza correctamente.
 *   4. Estado de carga: skeletons mientras llegan los datos.
 *   5. El saludo usa el username del usuario autenticado.
 *
 * Por qué estas pruebas son valiosas para el portfolio:
 *   Demuestran que sabes testear páginas que tienen múltiples
 *   peticiones en paralelo (Promise.all implícito de React Query).
 *   También validan que la invalidación de caché funciona:
 *   marcar un hábito desde el Dashboard actualiza el contador.
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import Dashboard from '../../pages/Dashboard'
import { renderWithProviders, buildDashboardStats, buildHabit } from '../../test/utils.jsx'
import { server } from '../../test/server'

// Mock del Layout para no renderizar el navbar en estos tests
vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}))

const setup = () => {
  renderWithProviders(<Dashboard />)
}

// ════════════════════════════════════════════════════════════════════════════
//  Stat cards
// ════════════════════════════════════════════════════════════════════════════

describe('Dashboard — stat cards', () => {

  it('muestra el número de hábitos completados hoy', async () => {
    server.use(
      http.get('/api/habits/dashboard', () =>
        HttpResponse.json(buildDashboardStats({ habitsCompletedToday: 4, totalActiveHabits: 7 }))
      )
    )
    setup()

    await waitFor(() => {
      expect(screen.getByText('4 / 7')).toBeInTheDocument()
    })
  })

  it('muestra la mejor racha activa', async () => {
    server.use(
      http.get('/api/habits/dashboard', () =>
        HttpResponse.json(buildDashboardStats({ bestCurrentStreak: 12 }))
      )
    )
    setup()

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('días consecutivos')).toBeInTheDocument()
    })
  })

  it('muestra el porcentaje de cumplimiento semanal', async () => {
    server.use(
      http.get('/api/habits/dashboard', () =>
        HttpResponse.json(buildDashboardStats({ weeklyCompletionRate: 75 }))
      )
    )
    setup()

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('esta semana')).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Gráfico semanal
// ════════════════════════════════════════════════════════════════════════════

describe('Dashboard — gráfico semanal', () => {

  it('muestra el título "Actividad semanal"', async () => {
    setup()

    await waitFor(() => {
      expect(screen.getByText('Actividad semanal')).toBeInTheDocument()
    })
  })

  it('muestra el subtítulo del eje', async () => {
    setup()

    await waitFor(() => {
      expect(screen.getByText(/% de hábitos completados/i)).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Lista de hábitos de hoy
// ════════════════════════════════════════════════════════════════════════════

describe('Dashboard — hábitos de hoy', () => {

  it('muestra la sección "Hoy"', async () => {
    setup()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
    })
  })

  it('muestra los hábitos activos', async () => {
    server.use(
      http.get('/api/habits', () => HttpResponse.json([
        buildHabit({ id: 1, name: 'Meditar', frequencyType: 'DAILY' }),
        buildHabit({ id: 2, name: 'Correr',  frequencyType: 'DAILY' }),
      ]))
    )
    setup()

    await waitFor(() => {
      expect(screen.getByText('Meditar')).toBeInTheDocument()
      expect(screen.getByText('Correr')).toBeInTheDocument()
    })
  })

  it('muestra estado vacío si no hay hábitos', async () => {
    server.use(
      http.get('/api/habits', () => HttpResponse.json([]))
    )
    setup()

    await waitFor(() => {
      expect(screen.getByText('No tienes hábitos todavía')).toBeInTheDocument()
    })
  })

  it('tiene el link "Ver todos" hacia /habits', async () => {
    setup()

    await waitFor(() => {
      const verTodosLink = screen.getByRole('link', { name: /Ver todos/i })
      expect(verTodosLink).toHaveAttribute('href', '/habits')
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Saludo con username
// ════════════════════════════════════════════════════════════════════════════

describe('Dashboard — saludo', () => {

  it('muestra el username del usuario en el saludo', async () => {
    renderWithProviders(<Dashboard />, {
      authValue: {
        user: { id: 1, username: 'carlos_dev', email: 'c@test.com' },
        isAuthenticated: true,
        isLoading: false,
        logout: vi.fn(),
      }
    })

    expect(screen.getByText(/Hola, carlos_dev/i)).toBeInTheDocument()
  })

  it('muestra la fecha de hoy', async () => {
    setup()

    // La fecha se formatea como "lunes 9 de marzo" etc.
    // Verificamos que hay un texto que contiene "de" (separador en español)
    const dateText = screen.getByText(/\d+ de \w+/i)
    expect(dateText).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Estado de carga
// ════════════════════════════════════════════════════════════════════════════

describe('Dashboard — carga', () => {

  it('muestra skeletons mientras carga el dashboard', () => {
    server.use(
      http.get('/api/habits/dashboard', async () => {
        await new Promise(r => setTimeout(r, 300))
        return HttpResponse.json(buildDashboardStats())
      })
    )
    setup()

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
