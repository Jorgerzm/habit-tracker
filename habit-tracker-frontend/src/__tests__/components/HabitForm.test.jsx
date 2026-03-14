/**
 * src/__tests__/components/HabitForm.test.jsx
 *
 * Tests del formulario de creación/edición de hábitos.
 *
 * Qué testeamos:
 *   1. Renderizado inicial (campos visibles, valores por defecto).
 *   2. Validaciones: campos obligatorios, longitud, etc.
 *   3. Campos condicionales: weeklyDays aparece solo con WEEKLY,
 *      customFrequencyDays solo con CUSTOM.
 *   4. Envío correcto: llama a la API con los datos del formulario.
 *   5. Modo edición: pre-rellena los campos con el hábito existente.
 *   6. Cierre: el botón Cancelar llama a onClose.
 *
 * Técnica:
 *   userEvent > fireEvent.
 *   userEvent simula interacciones reales (keydown + keyup + input),
 *   fireEvent solo dispara el evento. Los componentes controlados
 *   de React Hook Form responden mejor a userEvent.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HabitForm from '../../components/habits/HabitForm'
import { renderWithProviders, buildHabit } from '../../test/utils.jsx'
import { server } from '../../test/server'
import { errorHandlers } from '../../test/handlers'

const onClose = vi.fn()

const setup = (props = {}) => {
  const user = userEvent.setup()
  renderWithProviders(<HabitForm onClose={onClose} {...props} />)
  return { user }
}

beforeEach(() => { onClose.mockClear() })

// ════════════════════════════════════════════════════════════════════════════
//  Renderizado inicial
// ════════════════════════════════════════════════════════════════════════════

describe('HabitForm — renderizado', () => {

  it('muestra el título "Nuevo hábito" en modo creación', () => {
    setup()
    expect(screen.getByText('Nuevo hábito')).toBeInTheDocument()
  })

  it('muestra el título "Editar hábito" en modo edición', () => {
    setup({ habit: buildHabit({ name: 'Meditar' }) })
    expect(screen.getByText('Editar hábito')).toBeInTheDocument()
  })

  it('pre-rellena el nombre en modo edición', () => {
    setup({ habit: buildHabit({ name: 'Correr 5km' }) })
    expect(screen.getByPlaceholderText(/Ej: Meditar/i)).toHaveValue('Correr 5km')
  })

  it('muestra las 3 opciones de frecuencia en modo creación', () => {
    setup()
    expect(screen.getByText('Diario')).toBeInTheDocument()
    expect(screen.getByText('Semanal')).toBeInTheDocument()
    expect(screen.getByText('Personalizado')).toBeInTheDocument()
  })

  it('oculta las opciones de frecuencia en modo edición', () => {
    setup({ habit: buildHabit() })
    expect(screen.queryByText('Diario')).not.toBeInTheDocument()
  })

  it('el botón de envío dice "Crear hábito" en modo creación', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Crear hábito' })).toBeInTheDocument()
  })

  it('el botón de envío dice "Guardar cambios" en modo edición', () => {
    setup({ habit: buildHabit() })
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Validaciones
// ════════════════════════════════════════════════════════════════════════════

describe('HabitForm — validaciones', () => {

  it('muestra error si el nombre está vacío al enviar', async () => {
    const { user } = setup()

    await user.click(screen.getByRole('button', { name: 'Crear hábito' }))

    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    })
  })

  it('no muestra error de nombre si se escribe algo', async () => {
    const { user } = setup()
    const input = screen.getByPlaceholderText(/Ej: Meditar/i)

    await user.type(input, 'Yoga')
    await user.click(screen.getByRole('button', { name: 'Crear hábito' }))

    await waitFor(() => {
      expect(screen.queryByText('El nombre es obligatorio')).not.toBeInTheDocument()
    })
  })

  it('muestra error si los días semanales están vacíos con tipo WEEKLY', async () => {
    const { user } = setup()

    // Seleccionar WEEKLY
    await user.click(screen.getByText('Semanal'))
    await user.type(screen.getByPlaceholderText(/Ej: Meditar/i), 'Ejercicio')

    await user.click(screen.getByRole('button', { name: 'Crear hábito' }))

    await waitFor(() => {
      expect(screen.getByText('Selecciona al menos un día')).toBeInTheDocument()
    })
  })

  it('no muestra el error de días si se selecciona alguno', async () => {
    const { user } = setup()

    await user.click(screen.getByText('Semanal'))
    await user.type(screen.getByPlaceholderText(/Ej: Meditar/i), 'Ejercicio')

    // Seleccionar Lunes
    await user.click(screen.getByRole('button', { name: 'L' }))
    await user.click(screen.getByRole('button', { name: 'Crear hábito' }))

    await waitFor(() => {
      expect(screen.queryByText('Selecciona al menos un día')).not.toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Campos condicionales
// ════════════════════════════════════════════════════════════════════════════

describe('HabitForm — campos condicionales', () => {

  it('NO muestra días de la semana cuando la frecuencia es DAILY', () => {
    setup()
    // DAILY es el tipo por defecto
    expect(screen.queryByText('Días de la semana *')).not.toBeInTheDocument()
  })

  it('muestra los 7 botones de días al seleccionar WEEKLY', async () => {
    const { user } = setup()

    await user.click(screen.getByText('Semanal'))

    // L M X J V S D
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'D' })).toBeInTheDocument()
    expect(screen.getAllByRole('button').filter(b =>
      ['L','M','X','J','V','S','D'].includes(b.textContent)
    )).toHaveLength(7)
  })

  it('muestra el campo de intervalo al seleccionar CUSTOM', async () => {
    const { user } = setup()

    await user.click(screen.getByText('Personalizado'))

    expect(screen.getByText('Repetir cada')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('oculta el campo de intervalo al volver a DAILY', async () => {
    const { user } = setup()

    await user.click(screen.getByText('Personalizado'))
    expect(screen.getByText('Repetir cada')).toBeInTheDocument()

    await user.click(screen.getByText('Diario'))
    expect(screen.queryByText('Repetir cada')).not.toBeInTheDocument()
  })

  it('los días seleccionados en WEEKLY se deseleccionan al cambiar a DAILY', async () => {
    const { user } = setup()

    await user.click(screen.getByText('Semanal'))
    await user.click(screen.getByRole('button', { name: 'L' }))

    // L está seleccionado (debería tener clases de "activo")
    const lunesBtn = screen.getByRole('button', { name: 'L' })
    expect(lunesBtn.className).toMatch(/bg-amber/)

    await user.click(screen.getByText('Diario'))
    await user.click(screen.getByText('Semanal'))

    // Tras volver a WEEKLY, L ya no está seleccionado
    const lunesBtnNew = screen.getByRole('button', { name: 'L' })
    expect(lunesBtnNew.className).not.toMatch(/bg-amber-600/)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Envío del formulario
// ════════════════════════════════════════════════════════════════════════════

describe('HabitForm — envío', () => {

  it('cierra el modal tras crear un hábito con éxito', async () => {
    const { user } = setup()

    await user.type(screen.getByPlaceholderText(/Ej: Meditar/i), 'Yoga')
    await user.click(screen.getByRole('button', { name: 'Crear hábito' }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('cierra el modal tras guardar cambios en modo edición', async () => {
    const { user } = setup({ habit: buildHabit({ name: 'Meditar' }) })

    const nameInput = screen.getByPlaceholderText(/Ej: Meditar/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Meditación avanzada')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('NO cierra el modal si la API devuelve un error', async () => {
    server.use(errorHandlers.createHabitConflict)
    const { user } = setup()

    await user.type(screen.getByPlaceholderText(/Ej: Meditar/i), 'Ejercicio')
    // WEEKLY sin días → la API devuelve 400
    await user.click(screen.getByText('Semanal'))
    await user.click(screen.getByRole('button', { name: 'Crear hábito' }))

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Cierre del modal
// ════════════════════════════════════════════════════════════════════════════

describe('HabitForm — cierre', () => {

  it('el botón Cancelar llama a onClose', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('el botón × llama a onClose', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
