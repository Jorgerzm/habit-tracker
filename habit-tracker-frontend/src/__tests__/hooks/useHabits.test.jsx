/**
 * src/__tests__/hooks/useHabits.test.jsx
 *
 * Tests de los hooks de React Query: useHabits, useCreateHabit,
 * useDeleteHabit, useToggleLog, useHabitStats.
 *
 * Técnica — renderHook + act + waitFor:
 *   renderHook() ejecuta el hook en un componente mínimo y expone
 *   { result } que refleja el estado actual del hook.
 *   act() envuelve acciones que disparan actualizaciones de estado.
 *   waitFor() espera hasta que la condición sea verdadera.
 *
 * Por qué testear hooks directamente:
 *   Los tests de componente ya cubren el flujo visual. Los tests de hook
 *   cubren la LÓGICA de caché: ¿se actualiza correctamente tras una
 *   mutación? ¿se invalidan las queries correctas? ¿qué pasa si falla?
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import {
  useHabits, useHabitStats,
  useCreateHabit, useDeleteHabit, useToggleLog,
  habitKeys
} from '../../hooks/useHabits'
import { AuthContext } from '../../context/AuthContext'
import { server } from '../../test/server'
import { errorHandlers } from '../../test/handlers'
import { buildHabit } from '../../test/utils.jsx'
import { http, HttpResponse } from 'msw'

// ── Wrapper de providers para renderHook ────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries:   { retry: 0, gcTime: 0 },
      mutations: { retry: 0 },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  })

  const authValue = {
    user: { id: 1, username: 'testuser' },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter>{children}</MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    )
  }

  return { Wrapper, queryClient }
}

// ════════════════════════════════════════════════════════════════════════════
//  useHabits — query básica
// ════════════════════════════════════════════════════════════════════════════

describe('useHabits', () => {

  it('devuelve la lista de hábitos del servidor', async () => {
    const { Wrapper } = createWrapper()
    const { result }  = renderHook(() => useHabits(), { wrapper: Wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(3)
    expect(result.current.data[0].name).toBe('Meditar')
  })

  it('isError = true si la API falla', async () => {
    server.use(errorHandlers.serverError)

    const { Wrapper } = createWrapper()
    const { result }  = renderHook(() => useHabits(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('devuelve array vacío si no hay hábitos', async () => {
    server.use(errorHandlers.emptyHabits)

    const { Wrapper } = createWrapper()
    const { result }  = renderHook(() => useHabits(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  useCreateHabit
// ════════════════════════════════════════════════════════════════════════════

describe('useCreateHabit', () => {

  it('añade el nuevo hábito al caché tras crear con éxito', async () => {
    const { Wrapper, queryClient } = createWrapper()

    queryClient.setQueryData(habitKeys.lists(), [
      buildHabit({ id: 1, name: 'Meditar' })
    ])

    const { result } = renderHook(() => useCreateHabit(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({ name: 'Yoga', frequencyType: 'DAILY' })
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData(habitKeys.lists())
      expect(cached).toHaveLength(2)
      expect(cached.some(h => h.name === 'Yoga')).toBe(true)
    })
  })

  it('isError = true si la API rechaza la creación', async () => {
    server.use(errorHandlers.createHabitConflict)

    const { Wrapper } = createWrapper()
    const { result }  = renderHook(() => useCreateHabit(), { wrapper: Wrapper })

    await act(async () => {
      try { await result.current.mutateAsync({ name: 'Fallo', frequencyType: 'WEEKLY' }) }
      catch { /* esperado */ }
    })

    expect(result.current.isError).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  useDeleteHabit
// ════════════════════════════════════════════════════════════════════════════

describe('useDeleteHabit', () => {

  it('elimina el hábito del caché tras borrar con éxito', async () => {
    const { Wrapper, queryClient } = createWrapper()

    queryClient.setQueryData(habitKeys.lists(), [
      buildHabit({ id: 1, name: 'Meditar' }),
      buildHabit({ id: 2, name: 'Yoga'    }),
    ])

    const { result } = renderHook(() => useDeleteHabit(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync(1)
    })

    await waitFor(() => {
      const cached = queryClient.getQueryData(habitKeys.lists())
      expect(cached).toHaveLength(1)
      expect(cached[0].name).toBe('Yoga')
    })
  })

  it('no modifica el caché si el servidor rechaza el borrado', async () => {
    server.use(
      http.delete('/api/habits/:id', () => new HttpResponse(null, { status: 403 }))
    )

    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(habitKeys.lists(), [
      buildHabit({ id: 1, name: 'Meditar' }),
    ])

    const { result } = renderHook(() => useDeleteHabit(), { wrapper: Wrapper })

    await act(async () => {
      try { await result.current.mutateAsync(1) }
      catch { /* esperado */ }
    })

    const cached = queryClient.getQueryData(habitKeys.lists())
    expect(cached).toHaveLength(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  useToggleLog
// ════════════════════════════════════════════════════════════════════════════

describe('useToggleLog', () => {

  it('llama a la API con los parámetros correctos', async () => {
    let received = null
    server.use(
      http.post('/api/habits/1/logs/toggle', async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({
          log:     { id: 99, date: '2024-06-12', status: 'COMPLETED', notes: null },
          message: 'Hábito marcado como completado',
        })
      })
    )

    const { Wrapper } = createWrapper()
    const { result }  = renderHook(() => useToggleLog(1), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({ date: '2024-06-12', notes: 'Bien!' })
    })

    expect(received).toEqual({ date: '2024-06-12', notes: 'Bien!' })
  })

  it('devuelve la respuesta con el estado actualizado del log', async () => {
    const { Wrapper } = createWrapper()
    const { result }  = renderHook(() => useToggleLog(1), { wrapper: Wrapper })

    let res
    await act(async () => {
      res = await result.current.mutateAsync({ date: '2024-06-12' })
    })

    expect(res.log.status).toBe('COMPLETED')
    expect(res.message).toBe('Hábito marcado como completado')
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  useHabitStats
// ════════════════════════════════════════════════════════════════════════════

describe('useHabitStats', () => {

  it('devuelve las estadísticas del hábito', async () => {
    const { Wrapper } = createWrapper()
    const { result }  = renderHook(() => useHabitStats(1), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.currentStreak).toBe(5)
    expect(result.current.data.maxStreak).toBe(14)
    expect(result.current.data.totalCompleted).toBe(42)
  })

  it('la query está deshabilitada si habitId es null', () => {
    const { Wrapper } = createWrapper()
    const { result }  = renderHook(() => useHabitStats(null), { wrapper: Wrapper })

    // enabled: false → fetchStatus idle, nunca hace la petición
    expect(result.current.fetchStatus).toBe('idle')
  })
})
