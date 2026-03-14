/**
 * src/__tests__/components/HabitCard.test.jsx
 *
 * Tests de la tarjeta de hábito (expandible con calendario + stats).
 *
 * Qué testeamos:
 *   1. Renderizado: nombre, frecuencia, botones.
 *   2. Expansión/colapso al hacer clic en ⌄.
 *   3. Tabs: cambiar entre Calendario y Estadísticas.
 *   4. Flujo de borrado en 2 pasos (1er clic: advertencia, 2º clic: borrar).
 *   5. Apertura y cierre del modal de edición.
 *   6. Visualización de detalles según frecuencia (weeklyDays, interval).
 *
 * Patrón de doble clic para borrar:
 *   Este patrón evita borrados accidentales. El test verifica que:
 *   - Después del 1er clic: aparece ⚠ y el botón de cancelar ✕.
 *   - Después del 2º clic: se llama a la API de borrado.
 *   - Si se cancela entre los dos clics: no se borra.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HabitCard from '../../components/habits/HabitCard'
import { renderWithProviders, buildHabit } from '../../test/utils.jsx'
import { server } from '../../test/server'
import { http, HttpResponse } from 'msw'

const setup = (habitOverrides = {}) => {
  const user  = userEvent.setup()
  const habit = buildHabit(habitOverrides)
  renderWithProviders(<HabitCard habit={habit} />)
  return { user, habit }
}

// ════════════════════════════════════════════════════════════════════════════
//  Renderizado inicial (colapsado)
// ════════════════════════════════════════════════════════════════════════════

describe('HabitCard — renderizado', () => {

  it('muestra el nombre del hábito', () => {
    setup({ name: 'Meditar' })
    expect(screen.getByText('Meditar')).toBeInTheDocument()
  })

  it('muestra la etiqueta de frecuencia DAILY', () => {
    setup({ frequencyType: 'DAILY' })
    expect(screen.getByText('Diario')).toBeInTheDocument()
  })

  it('muestra la etiqueta de frecuencia WEEKLY', () => {
    setup({ frequencyType: 'WEEKLY', weeklyDays: [1, 3, 5] })
    expect(screen.getByText('Semanal')).toBeInTheDocument()
  })

  it('muestra los días de la semana para hábitos WEEKLY', () => {
    setup({ frequencyType: 'WEEKLY', weeklyDays: [1, 3, 5] })
    expect(screen.getByText(/Lun.*Mié.*Vie/i)).toBeInTheDocument()
  })

  it('muestra el intervalo para hábitos CUSTOM', () => {
    setup({ frequencyType: 'CUSTOM', customFrequencyDays: 3 })
    expect(screen.getByText('Cada 3 días')).toBeInTheDocument()
  })

  it('muestra la descripción si existe', () => {
    setup({ description: 'Meditación de mindfulness' })
    expect(screen.getByText('Meditación de mindfulness')).toBeInTheDocument()
  })

  it('el calendario NO es visible cuando la tarjeta está colapsada', () => {
    setup()
    // Las etiquetas L M X J V S D del calendario no deben estar presentes
    // (las de la cabecera de la tarjeta no existen en este componente)
    expect(screen.queryByText('📅 Calendario')).not.toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Expansión
// ════════════════════════════════════════════════════════════════════════════

describe('HabitCard — expansión', () => {

  it('muestra los tabs al hacer clic en ⌄', async () => {
    const { user } = setup()

    const expandBtn = screen.getByTitle('Ver detalle')
    await user.click(expandBtn)

    expect(screen.getByText('📅 Calendario')).toBeInTheDocument()
    expect(screen.getByText('📊 Estadísticas')).toBeInTheDocument()
  })

  it('oculta los tabs al hacer clic de nuevo en ⌄', async () => {
    const { user } = setup()

    const expandBtn = screen.getByTitle('Ver detalle')
    await user.click(expandBtn)
    await user.click(expandBtn)

    expect(screen.queryByText('📅 Calendario')).not.toBeInTheDocument()
  })

  it('muestra el calendario por defecto tras expandir', async () => {
    const { user } = setup()

    await user.click(screen.getByTitle('Ver detalle'))

    // El tab de Calendario debe estar "activo" (tiene clases de seleccionado)
    await waitFor(() => {
      const calendarTab = screen.getByText('📅 Calendario')
      expect(calendarTab.className).toMatch(/bg-white/)
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Tabs
// ════════════════════════════════════════════════════════════════════════════

describe('HabitCard — tabs', () => {

  it('al hacer clic en Estadísticas se carga HabitStats', async () => {
    const { user } = setup({ id: 1 })

    await user.click(screen.getByTitle('Ver detalle'))

    const statsTab = screen.getByText('📊 Estadísticas')
    await user.click(statsTab)

    // HabitStats carga con useHabitStats, que hará la petición al servidor
    await waitFor(() => {
      // El mock devuelve currentStreak: 5 y maxStreak: 14
      expect(screen.getByText('5')).toBeInTheDocument()   // currentStreak
      expect(screen.getByText('14')).toBeInTheDocument()  // maxStreak
    }, { timeout: 3000 })
  })

  it('al volver al tab Calendario ya no están las stats', async () => {
    const { user } = setup({ id: 1 })

    await user.click(screen.getByTitle('Ver detalle'))
    await user.click(screen.getByText('📊 Estadísticas'))

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Volver al calendario
    await user.click(screen.getByText('📅 Calendario'))

    await waitFor(() => {
      expect(screen.queryByText('Racha actual')).not.toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Flujo de borrado (doble clic)
// ════════════════════════════════════════════════════════════════════════════

describe('HabitCard — borrado', () => {

  it('el primer clic en ⊗ muestra el icono de advertencia ⚠', async () => {
    const { user } = setup()

    const deleteBtn = screen.getByTitle('Eliminar')
    await user.click(deleteBtn)

    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('el primer clic muestra el botón de cancelar ✕', async () => {
    const { user } = setup()

    await user.click(screen.getByTitle('Eliminar'))

    // Aparece botón ✕ para cancelar la confirmación
    const cancelBtn = screen.getByRole('button', { name: '✕' })
    expect(cancelBtn).toBeInTheDocument()
  })

  it('el botón ✕ cancela el borrado y restaura el estado', async () => {
    const { user } = setup()

    await user.click(screen.getByTitle('Eliminar'))
    await user.click(screen.getByRole('button', { name: '✕' }))

    expect(screen.queryByText('⚠')).not.toBeInTheDocument()
    expect(screen.getByTitle('Eliminar')).toBeInTheDocument()
  })

  it('el segundo clic en ⚠ llama a la API de borrado', async () => {
    let deleteCalled = false
    server.use(
      http.delete('/api/habits/:id', ({ params }) => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      })
    )

    const { user } = setup({ id: 1 })

    // Primer clic
    await user.click(screen.getByTitle('Eliminar'))
    // Segundo clic en ⚠
    await user.click(screen.getByText('⚠'))

    await waitFor(() => {
      expect(deleteCalled).toBe(true)
    })
  })

  it('expandir la tarjeta cancela la confirmación de borrado', async () => {
    const { user } = setup()

    await user.click(screen.getByTitle('Eliminar'))
    expect(screen.getByText('⚠')).toBeInTheDocument()

    // Expandir cancela el estado de confirmación
    await user.click(screen.getByTitle('Ver detalle'))

    expect(screen.queryByText('⚠')).not.toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Modal de edición
// ════════════════════════════════════════════════════════════════════════════

describe('HabitCard — edición', () => {

  it('el botón ✎ abre el modal de edición', async () => {
    const { user } = setup({ name: 'Meditar' })

    await user.click(screen.getByTitle('Editar'))

    expect(screen.getByText('Editar hábito')).toBeInTheDocument()
  })

  it('el modal de edición muestra el nombre pre-rellenado', async () => {
    const { user } = setup({ name: 'Yoga matutino' })

    await user.click(screen.getByTitle('Editar'))

    expect(screen.getByDisplayValue('Yoga matutino')).toBeInTheDocument()
  })

  it('cerrar el modal de edición hace que desaparezca', async () => {
    const { user } = setup()

    await user.click(screen.getByTitle('Editar'))
    expect(screen.getByText('Editar hábito')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('Editar hábito')).not.toBeInTheDocument()
  })
})
