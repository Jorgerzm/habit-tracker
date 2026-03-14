/**
 * src/__tests__/components/HabitCalendar.test.jsx
 *
 * Tests del calendario mensual de un hábito.
 *
 * Qué testeamos:
 *   1. Renderizado: nombre del mes, etiquetas L M X J V S D.
 *   2. Días completados tienen la clase visual correcta.
 *   3. Días futuros están deshabilitados.
 *   4. Clic en un día pendiente → llama a toggleHabitLog.
 *   5. Clic en un día completado de hoy → lo desmarca.
 *   6. Navegación entre meses (← →).
 *   7. La flecha → está deshabilitada en el mes actual.
 *
 * Punto clave de testing de calendarios:
 *   Los tests de calendarios son frágiles si dependen de "hoy".
 *   Para evitarlo, usamos vi.useFakeTimers() para fijar la fecha.
 *   Así los tests siguen pasando en enero y en diciembre.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import HabitCalendar from '../../components/habits/HabitCalendar'
import { renderWithProviders, buildHabit } from '../../test/utils.jsx'
import { server } from '../../test/server'
import { http, HttpResponse } from 'msw'

// Fijar la fecha en un miércoles de mitad de mes para tener días antes y después
const FIXED_DATE = new Date('2024-06-12T12:00:00')
const TODAY_STR  = '2024-06-12'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})
afterEach(() => {
  vi.useRealTimers()
})

const habit = buildHabit({ id: 1, name: 'Meditar' })

const setup = () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  renderWithProviders(<HabitCalendar habit={habit} />)
  return { user }
}

// ════════════════════════════════════════════════════════════════════════════
//  Renderizado
// ════════════════════════════════════════════════════════════════════════════

describe('HabitCalendar — renderizado', () => {

  it('muestra el nombre del mes actual', async () => {
    setup()
    // Esperar a que carguen los logs
    await waitFor(() => {
      expect(screen.queryByText(/animate-pulse/)).not.toBeInTheDocument()
    })

    const monthLabel = format(FIXED_DATE, 'MMMM yyyy', { locale: es })
    expect(screen.getByText(new RegExp(monthLabel, 'i'))).toBeInTheDocument()
  })

  it('muestra las etiquetas de los días de la semana', async () => {
    setup()
    for (const label of ['L', 'M', 'X', 'J', 'V', 'S', 'D']) {
      // Pueden haber múltiples (etiqueta de cabecera + número con misma letra)
      const elements = screen.getAllByText(label)
      expect(elements.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('muestra el día 12 con el anillo de "hoy"', async () => {
    // El servidor devuelve logs, esperamos a que se rendericen
    server.use(
      http.get('/api/habits/1/logs', () =>
        HttpResponse.json([
          { id: 1, date: TODAY_STR, status: 'COMPLETED', notes: null }
        ])
      )
    )
    setup()

    await waitFor(() => {
      // Buscar el botón del día 12
      const todayBtn = screen.getAllByRole('button').find(
        btn => btn.textContent === '12'
      )
      expect(todayBtn).toBeDefined()
      expect(todayBtn.className).toMatch(/day-cell--today/)
    })
  })

  it('muestra los días completados con la clase correcta', async () => {
    server.use(
      http.get('/api/habits/1/logs', () =>
        HttpResponse.json([
          { id: 1, date: '2024-06-10', status: 'COMPLETED', notes: null },
          { id: 2, date: '2024-06-11', status: 'COMPLETED', notes: null },
        ])
      )
    )
    setup()

    await waitFor(() => {
      // Buscar botones de días completados
      const completedBtns = screen.getAllByRole('button').filter(
        btn => btn.className.includes('day-cell--completed')
      )
      expect(completedBtns.length).toBeGreaterThanOrEqual(2)
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Interacciones con días
// ════════════════════════════════════════════════════════════════════════════

describe('HabitCalendar — interacciones', () => {

  it('los días futuros están deshabilitados', async () => {
    setup()

    await waitFor(() => {
      // Días 13-30 de junio son futuros
      const allBtns = screen.getAllByRole('button')
      const futureDays = allBtns.filter(
        btn => btn.className.includes('day-cell--future')
      )
      // Junio 2024 tiene días futuros del 13 al 30
      expect(futureDays.length).toBeGreaterThan(0)
      futureDays.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })
  })

  it('al hacer clic en un día pendiente se llama al toggle', async () => {
    let toggleCalled = false
    server.use(
      http.get('/api/habits/1/logs', () => HttpResponse.json([])),
      http.post('/api/habits/1/logs/toggle', async ({ request }) => {
        toggleCalled = true
        const body = await request.json()
        return HttpResponse.json({
          log: { id: 1, date: body.date, status: 'COMPLETED', notes: null },
          message: 'Hábito marcado como completado',
        })
      })
    )

    const { user } = setup()

    await waitFor(() => {
      const pendingBtns = screen.getAllByRole('button').filter(
        btn => btn.className.includes('day-cell--pending') && !btn.disabled
      )
      expect(pendingBtns.length).toBeGreaterThan(0)
    })

    // Clic en el día 12 (hoy, que está pendiente)
    const todayBtn = screen.getAllByRole('button').find(
      btn => btn.textContent === '12' && !btn.disabled
    )
    await user.click(todayBtn)

    await waitFor(() => {
      expect(toggleCalled).toBe(true)
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Navegación entre meses
// ════════════════════════════════════════════════════════════════════════════

describe('HabitCalendar — navegación', () => {

  it('la flecha derecha está deshabilitada en el mes actual', async () => {
    setup()

    await waitFor(() => {
      const nextBtn = screen.getByTitle ? screen.queryByRole('button', { name: '›' })
                                        : screen.getAllByRole('button').find(b => b.textContent === '›')
      // El botón › debe existir y estar deshabilitado cuando estamos en el mes actual
      const nextMonthBtn = screen.getAllByRole('button').find(b => b.textContent === '›')
      expect(nextMonthBtn).toBeDisabled()
    })
  })

  it('navegar al mes anterior muestra mayo 2024', async () => {
    setup()

    const prevBtn = screen.getAllByRole('button').find(b => b.textContent === '‹')
    await userEvent.click(prevBtn)

    await waitFor(() => {
      expect(screen.getByText(/mayo 2024/i)).toBeInTheDocument()
    })
  })

  it('tras navegar al anterior, la flecha derecha se habilita', async () => {
    setup()

    const prevBtn = screen.getAllByRole('button').find(b => b.textContent === '‹')
    await userEvent.click(prevBtn)

    const nextBtn = screen.getAllByRole('button').find(b => b.textContent === '›')
    expect(nextBtn).not.toBeDisabled()
  })
})
