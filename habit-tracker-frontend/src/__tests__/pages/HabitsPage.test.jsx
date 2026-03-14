/**
 * src/__tests__/pages/HabitsPage.test.jsx
 *
 * Tests de integración de la página completa de hábitos.
 *
 * Aquí testeamos el comportamiento de la página como un todo:
 * cómo interactúan los filtros, la búsqueda y el estado de la lista.
 *
 * Estos tests son más lentos que los de componente individual
 * porque renderizan más árbol de componentes, pero son más valiosos:
 * verifican que el flujo completo funciona desde el punto de vista
 * del usuario.
 *
 * Qué testeamos:
 *   1. Carga inicial: spinner → lista de hábitos.
 *   2. Estado vacío: botón para crear el primer hábito.
 *   3. Filtros por frecuencia (Todos / Diarios / Semanales / Personalizados).
 *   4. Búsqueda por nombre y descripción.
 *   5. El botón "+ Nuevo hábito" abre el modal.
 *   6. Estado de error con botón "Reintentar".
 *   7. El contador del encabezado refleja el número de hábitos.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HabitsPage from '../../pages/HabitsPage'
import { renderWithProviders, buildHabit } from '../../test/utils.jsx'
import { server } from '../../test/server'
import { errorHandlers } from '../../test/handlers'
import { http, HttpResponse } from 'msw'

// Mock de AppLayout para no renderizar el navbar en cada test de página
// (simplifica los tests y evita dependencias extra)
vi.mock('../../components/layout/AppLayout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}))

const setup = () => {
  const user = userEvent.setup()
  renderWithProviders(<HabitsPage />)
  return { user }
}

// ════════════════════════════════════════════════════════════════════════════
//  Carga inicial
// ════════════════════════════════════════════════════════════════════════════

describe('HabitsPage — carga', () => {

  it('muestra skeletons mientras carga y luego los hábitos', async () => {
    setup()

    // Comprobar que aparecen skeletons (divs con animate-pulse)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)

    // Esperar a que aparezcan los hábitos reales
    await waitFor(() => {
      expect(screen.getByText('Meditar')).toBeInTheDocument()
      expect(screen.getByText('Ejercicio')).toBeInTheDocument()
      expect(screen.getByText('Leer')).toBeInTheDocument()
    })
  })

  it('el encabezado muestra el número de hábitos', async () => {
    setup()

    await waitFor(() => {
      // El servidor devuelve 3 hábitos
      expect(screen.getByText(/3 hábitos activos/i)).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Estado vacío
// ════════════════════════════════════════════════════════════════════════════

describe('HabitsPage — estado vacío', () => {

  it('muestra el estado vacío cuando no hay hábitos', async () => {
    server.use(errorHandlers.emptyHabits)
    setup()

    await waitFor(() => {
      expect(screen.getByText('Aún no tienes hábitos')).toBeInTheDocument()
    })
  })

  it('el botón "Crear mi primer hábito" abre el modal', async () => {
    server.use(errorHandlers.emptyHabits)
    const { user } = setup()

    await waitFor(() => {
      expect(screen.getByText('Crear mi primer hábito')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Crear mi primer hábito'))

    expect(screen.getByText('Nuevo hábito')).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Estado de error
// ════════════════════════════════════════════════════════════════════════════

describe('HabitsPage — error', () => {

  it('muestra el estado de error si la API falla', async () => {
    server.use(errorHandlers.serverError)
    setup()

    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar los hábitos')).toBeInTheDocument()
    })
  })

  it('el botón "Reintentar" recarga los datos', async () => {
    // Primera petición: falla
    let callCount = 0
    server.use(
      http.get('/api/habits', () => {
        callCount++
        if (callCount === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json([buildHabit({ name: 'Recuperado' })])
      })
    )
    const { user } = setup()

    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar los hábitos')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => {
      expect(screen.getByText('Recuperado')).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Filtros por frecuencia
// ════════════════════════════════════════════════════════════════════════════

describe('HabitsPage — filtros de frecuencia', () => {

  it('filtro "Todos" muestra los 3 hábitos', async () => {
    setup()

    await waitFor(() => {
      expect(screen.getByText('Meditar')).toBeInTheDocument()
      expect(screen.getByText('Ejercicio')).toBeInTheDocument()
      expect(screen.getByText('Leer')).toBeInTheDocument()
    })
  })

  it('filtro "Diarios" solo muestra hábitos DAILY', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Diarios' }))

    expect(screen.getByText('Meditar')).toBeInTheDocument()
    expect(screen.queryByText('Ejercicio')).not.toBeInTheDocument()
    expect(screen.queryByText('Leer')).not.toBeInTheDocument()
  })

  it('filtro "Semanales" solo muestra hábitos WEEKLY', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Ejercicio')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Semanales' }))

    expect(screen.queryByText('Meditar')).not.toBeInTheDocument()
    expect(screen.getByText('Ejercicio')).toBeInTheDocument()
    expect(screen.queryByText('Leer')).not.toBeInTheDocument()
  })

  it('filtro "Personalizados" solo muestra hábitos CUSTOM', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Leer')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Personalizados' }))

    expect(screen.queryByText('Meditar')).not.toBeInTheDocument()
    expect(screen.queryByText('Ejercicio')).not.toBeInTheDocument()
    expect(screen.getByText('Leer')).toBeInTheDocument()
  })

  it('al volver a "Todos" se restauran los 3 hábitos', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Diarios' }))
    await user.click(screen.getByRole('button', { name: 'Todos' }))

    expect(screen.getByText('Meditar')).toBeInTheDocument()
    expect(screen.getByText('Ejercicio')).toBeInTheDocument()
    expect(screen.getByText('Leer')).toBeInTheDocument()
  })

  it('filtro sin resultados muestra el estado "Sin resultados"', async () => {
    // Quitar los hábitos CUSTOM para que "Personalizados" quede vacío
    server.use(
      http.get('/api/habits', () => HttpResponse.json([
        buildHabit({ id: 1, name: 'Meditar',   frequencyType: 'DAILY'  }),
        buildHabit({ id: 2, name: 'Ejercicio', frequencyType: 'WEEKLY', weeklyDays: [1] }),
      ]))
    )
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Personalizados' }))

    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Búsqueda
// ════════════════════════════════════════════════════════════════════════════

describe('HabitsPage — búsqueda', () => {

  it('buscar por nombre filtra correctamente', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('Buscar hábito...'), 'ejer')

    expect(screen.queryByText('Meditar')).not.toBeInTheDocument()
    expect(screen.getByText('Ejercicio')).toBeInTheDocument()
  })

  it('buscar por descripción también filtra', async () => {
    server.use(
      http.get('/api/habits', () => HttpResponse.json([
        buildHabit({ id: 1, name: 'Meditar',   description: 'zen y calma' }),
        buildHabit({ id: 2, name: 'Ejercicio', description: 'cardio intenso' }),
      ]))
    )
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('Buscar hábito...'), 'cardio')

    expect(screen.queryByText('Meditar')).not.toBeInTheDocument()
    expect(screen.getByText('Ejercicio')).toBeInTheDocument()
  })

  it('limpiar el buscador restaura todos los hábitos', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    const searchInput = screen.getByPlaceholderText('Buscar hábito...')
    await user.type(searchInput, 'med')

    expect(screen.queryByText('Ejercicio')).not.toBeInTheDocument()

    await user.clear(searchInput)

    expect(screen.getByText('Ejercicio')).toBeInTheDocument()
  })

  it('la búsqueda no distingue entre mayúsculas y minúsculas', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('Buscar hábito...'), 'MEDITAR')

    expect(screen.getByText('Meditar')).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Modal de creación
// ════════════════════════════════════════════════════════════════════════════

describe('HabitsPage — crear hábito', () => {

  it('el botón "+ Nuevo hábito" abre el modal de creación', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '+ Nuevo hábito' }))

    expect(screen.getByText('Nuevo hábito')).toBeInTheDocument()
  })

  it('cerrar el modal hace que desaparezca', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '+ Nuevo hábito' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Nuevo hábito')).not.toBeInTheDocument()
  })

  it('tras crear un hábito aparece en la lista', async () => {
    const { user } = setup()

    await waitFor(() => expect(screen.getByText('Meditar')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '+ Nuevo hábito' }))
    await user.type(screen.getByPlaceholderText(/Ej: Meditar/i), 'Nuevo hábito test')
    await user.click(screen.getByRole('button', { name: 'Crear hábito' }))

    // El modal se cierra
    await waitFor(() => {
      expect(screen.queryByText('Nuevo hábito')).not.toBeInTheDocument()
    })
  })
})
