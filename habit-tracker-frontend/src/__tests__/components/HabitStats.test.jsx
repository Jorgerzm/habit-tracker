/**
 * src/__tests__/components/HabitStats.test.jsx
 *
 * Tests del componente de estadísticas de un hábito individual.
 *
 * Qué testeamos:
 *   1. Estado de carga: skeletons mientras llegan los datos.
 *   2. Renderizado de rachas: valores numéricos correctos.
 *   3. Barras de progreso: porcentajes de semana y mes.
 *   4. Total histórico de días completados.
 *   5. Caso extremo: hábito sin ningún dato (todo a 0).
 *
 * Nota sobre los porcentajes:
 *   El componente convierte completionRateWeek (0.0–1.0)
 *   a porcentaje (0–100%) con Math.round().
 *   completionRateWeek: 0.857 → "86%"  (no 85%)
 *   Esto es un detalle de negocio que vale la pena testear
 *   para detectar si alguien cambia la fórmula.
 */

import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import HabitStats from '../../components/habits/HabitStats'
import { renderWithProviders, buildStats } from '../../test/utils.jsx'
import { server } from '../../test/server'

// ════════════════════════════════════════════════════════════════════════════
//  Carga
// ════════════════════════════════════════════════════════════════════════════

describe('HabitStats — carga', () => {

  it('muestra skeletons mientras la petición está en curso', () => {
    // Retrasamos la respuesta para capturar el estado de carga
    server.use(
      http.get('/api/habits/:habitId/stats', async () => {
        await new Promise(r => setTimeout(r, 500))
        return HttpResponse.json(buildStats())
      })
    )

    renderWithProviders(<HabitStats habitId={1} />)

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('muestra el contenido cuando los datos están disponibles', async () => {
    renderWithProviders(<HabitStats habitId={1} />)

    // El handler por defecto devuelve buildStats() inmediatamente
    expect(await screen.findByText('Racha actual')).toBeInTheDocument()
    expect(screen.getByText('Racha máxima')).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Rachas
// ════════════════════════════════════════════════════════════════════════════

describe('HabitStats — rachas', () => {

  it('muestra los valores de racha actuales', async () => {
    server.use(
      http.get('/api/habits/:habitId/stats', () =>
        HttpResponse.json(buildStats({ currentStreak: 12, maxStreak: 35 }))
      )
    )

    renderWithProviders(<HabitStats habitId={1} />)

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('35')).toBeInTheDocument()
    })
  })

  it('muestra racha 0 cuando no se ha completado ningún día', async () => {
    server.use(
      http.get('/api/habits/:habitId/stats', () =>
        HttpResponse.json(buildStats({ currentStreak: 0, maxStreak: 0 }))
      )
    )

    renderWithProviders(<HabitStats habitId={1} />)

    await waitFor(() => {
      // Deben aparecer al menos dos ceros (racha actual + racha máxima)
      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('diferencia visualmente racha actual y racha máxima', async () => {
    server.use(
      http.get('/api/habits/:habitId/stats', () =>
        HttpResponse.json(buildStats({ currentStreak: 7, maxStreak: 21 }))
      )
    )

    renderWithProviders(<HabitStats habitId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Racha actual')).toBeInTheDocument()
      expect(screen.getByText('Racha máxima')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('21')).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Porcentajes de cumplimiento
// ════════════════════════════════════════════════════════════════════════════

describe('HabitStats — porcentajes', () => {

  it('convierte correctamente la tasa decimal a porcentaje', async () => {
    server.use(
      http.get('/api/habits/:habitId/stats', () =>
        HttpResponse.json(buildStats({
          completionRateWeek:  0.857,   // → 86%
          completionRateMonth: 0.72,    // → 72%
        }))
      )
    )

    renderWithProviders(<HabitStats habitId={1} />)

    await waitFor(() => {
      expect(screen.getByText('86%')).toBeInTheDocument()
      expect(screen.getByText('72%')).toBeInTheDocument()
    })
  })

  it('muestra 0% cuando no hay cumplimiento', async () => {
    server.use(
      http.get('/api/habits/:habitId/stats', () =>
        HttpResponse.json(buildStats({
          completionRateWeek:  0,
          completionRateMonth: 0,
        }))
      )
    )

    renderWithProviders(<HabitStats habitId={1} />)

    await waitFor(() => {
      const zeroPercents = screen.getAllByText('0%')
      expect(zeroPercents.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('muestra 100% con cumplimiento perfecto', async () => {
    server.use(
      http.get('/api/habits/:habitId/stats', () =>
        HttpResponse.json(buildStats({
          completionRateWeek:  1.0,
          completionRateMonth: 1.0,
        }))
      )
    )

    renderWithProviders(<HabitStats habitId={1} />)

    await waitFor(() => {
      const fullPercents = screen.getAllByText('100%')
      expect(fullPercents.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('muestra la etiqueta Semana y Mes en el gráfico', async () => {
    renderWithProviders(<HabitStats habitId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Semana')).toBeInTheDocument()
      expect(screen.getByText('Mes')).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Total histórico
// ════════════════════════════════════════════════════════════════════════════

describe('HabitStats — total histórico', () => {

  it('muestra el total de días completados', async () => {
    server.use(
      http.get('/api/habits/:habitId/stats', () =>
        HttpResponse.json(buildStats({ totalCompleted: 87 }))
      )
    )

    renderWithProviders(<HabitStats habitId={1} />)

    await waitFor(() => {
      expect(screen.getByText('87')).toBeInTheDocument()
      expect(screen.getByText('Total completado')).toBeInTheDocument()
    })
  })

  it('muestra la unidad "días" junto al total', async () => {
    renderWithProviders(<HabitStats habitId={1} />)

    // buildStats() tiene totalCompleted: 42
    await waitFor(() => {
      expect(screen.getByText('días')).toBeInTheDocument()
    })
  })
})
