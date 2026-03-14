/**
 * src/__tests__/components/AppLayout.test.jsx
 *
 * Tests del layout principal (navbar + contenido).
 *
 * Qué testeamos:
 *   1. Renderizado: logo, título, links de navegación.
 *   2. Username del usuario autenticado.
 *   3. Resaltado del link activo según la ruta actual.
 *   4. Botón "Salir" llama a logout del AuthContext.
 *   5. Los children se renderizan correctamente.
 *
 * Nota sobre MemoryRouter:
 *   renderWithProviders acepta `initialRoute` para simular
 *   que estamos en /dashboard o /habits. Esto permite testear
 *   qué link queda resaltado sin navegar de verdad.
 */

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppLayout from '../../components/layout/AppLayout'
import { renderWithProviders } from '../../test/utils.jsx'

// ════════════════════════════════════════════════════════════════════════════
//  Renderizado
// ════════════════════════════════════════════════════════════════════════════

describe('AppLayout — renderizado', () => {

  it('muestra el logo y el nombre de la app', () => {
    renderWithProviders(<AppLayout><div /></AppLayout>)

    // La "H" del logo
    expect(screen.getByText('H')).toBeInTheDocument()
    expect(screen.getByText('HabitTracker')).toBeInTheDocument()
  })

  it('muestra los dos links de navegación', () => {
    renderWithProviders(<AppLayout><div /></AppLayout>)

    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mis hábitos/i })).toBeInTheDocument()
  })

  it('muestra el username del usuario autenticado con @', () => {
    renderWithProviders(
      <AppLayout><div /></AppLayout>,
      {
        authValue: {
          user: { id: 1, username: 'maria_lopez', email: 'm@test.com' },
          isAuthenticated: true,
          isLoading: false,
          logout: vi.fn(),
        }
      }
    )

    expect(screen.getByText('@maria_lopez')).toBeInTheDocument()
  })

  it('renderiza los children dentro del main', () => {
    renderWithProviders(
      <AppLayout>
        <div data-testid="contenido-pagina">Hola mundo</div>
      </AppLayout>
    )

    expect(screen.getByTestId('contenido-pagina')).toBeInTheDocument()
    expect(screen.getByText('Hola mundo')).toBeInTheDocument()
  })

  it('muestra el botón Salir', () => {
    renderWithProviders(<AppLayout><div /></AppLayout>)

    expect(screen.getByText('Salir')).toBeInTheDocument()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Navegación activa
// ════════════════════════════════════════════════════════════════════════════

describe('AppLayout — link activo', () => {

  it('resalta Dashboard cuando la ruta es /dashboard', () => {
    renderWithProviders(
      <AppLayout><div /></AppLayout>,
      { initialRoute: '/dashboard' }
    )

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i })
    // Link activo tiene la clase de color ámbar
    expect(dashboardLink.className).toMatch(/text-amber-700/)
  })

  it('resalta "Mis hábitos" cuando la ruta es /habits', () => {
    renderWithProviders(
      <AppLayout><div /></AppLayout>,
      { initialRoute: '/habits' }
    )

    const habitsLink = screen.getByRole('link', { name: /Mis hábitos/i })
    expect(habitsLink.className).toMatch(/text-amber-700/)
  })

  it('Dashboard NO está resaltado cuando la ruta es /habits', () => {
    renderWithProviders(
      <AppLayout><div /></AppLayout>,
      { initialRoute: '/habits' }
    )

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i })
    // No debe tener la clase activa
    expect(dashboardLink.className).not.toMatch(/text-amber-700/)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Logout
// ════════════════════════════════════════════════════════════════════════════

describe('AppLayout — logout', () => {

  it('llama a logout al hacer clic en Salir', async () => {
    const mockLogout = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <AppLayout><div /></AppLayout>,
      {
        authValue: {
          user: { id: 1, username: 'testuser', email: 't@t.com' },
          isAuthenticated: true,
          isLoading: false,
          logout: mockLogout,
        }
      }
    )

    await user.click(screen.getByText('Salir'))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })
})
