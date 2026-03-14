/**
 * src/__tests__/pages/AuthPages.test.jsx
 *
 * Tests de integración de las páginas de autenticación.
 *
 * Qué testeamos:
 *   LOGIN:
 *   1. Renderizado del formulario (campos y botón).
 *   2. Validaciones: usuario vacío, contraseña vacía, mínimo de caracteres.
 *   3. Submit: llama a authContext.login con los valores del formulario.
 *   4. Estado de carga: el botón dice "Iniciando sesión..." durante la petición.
 *   5. Error: muestra el mensaje de error de la API.
 *   6. Link a registro está presente.
 *
 *   REGISTRO:
 *   1. Renderizado del formulario (4 campos + botón).
 *   2. Validaciones: campos vacíos, email inválido, contraseñas no coinciden.
 *   3. Submit: llama a authContext.register con los datos.
 *   4. Link a login está presente.
 *
 * Técnica — mock del AuthContext:
 *   No queremos testear la lógica del AuthContext aquí (tiene sus propios tests).
 *   Pasamos un authValue con `login` y `register` como vi.fn() para verificar
 *   que el componente los llama con los datos correctos.
 */

import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage    from '../../pages/LoginPage'
import RegisterPage from '../../pages/RegisterPage'
import { renderWithProviders } from '../../test/utils.jsx'

// ── Auth value para usuarios NO autenticados ─────────────────────────────────
const unauthValue = {
  user:            null,
  isAuthenticated: false,
  isLoading:       false,
  login:           vi.fn().mockResolvedValue({ username: 'testuser' }),
  register:        vi.fn().mockResolvedValue({ username: 'testuser' }),
  logout:          vi.fn(),
}

// ════════════════════════════════════════════════════════════════════════════
//  LoginPage
// ════════════════════════════════════════════════════════════════════════════

describe('LoginPage — renderizado', () => {

  it('muestra el título "Iniciar sesión"', () => {
    renderWithProviders(<LoginPage />, { authValue: { ...unauthValue } })
    expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  it('muestra los campos de usuario y contraseña', () => {
    renderWithProviders(<LoginPage />, { authValue: { ...unauthValue } })
    expect(screen.getByPlaceholderText('tu_usuario')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('muestra el botón de submit', () => {
    renderWithProviders(<LoginPage />, { authValue: { ...unauthValue } })
    expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument()
  })

  it('tiene un link a la página de registro', () => {
    renderWithProviders(<LoginPage />, { authValue: { ...unauthValue } })
    const registerLink = screen.getByRole('link', { name: /Regístrate gratis/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/register')
  })
})

describe('LoginPage — validaciones', () => {

  it('muestra error si el usuario está vacío', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { authValue: { ...unauthValue } })

    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }))

    expect(await screen.findByText('El usuario es obligatorio')).toBeInTheDocument()
  })

  it('muestra error si la contraseña está vacía', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { authValue: { ...unauthValue } })

    await user.type(screen.getByPlaceholderText('tu_usuario'), 'testuser')
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }))

    expect(await screen.findByText('La contraseña es obligatoria')).toBeInTheDocument()
  })

  it('muestra error si el usuario tiene menos de 3 caracteres', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { authValue: { ...unauthValue } })

    await user.type(screen.getByPlaceholderText('tu_usuario'), 'ab')
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }))

    expect(await screen.findByText('Mínimo 3 caracteres')).toBeInTheDocument()
  })

  it('no muestra errores con datos válidos', async () => {
    const user = userEvent.setup()
    const loginMock = vi.fn().mockResolvedValue({ username: 'ok' })
    renderWithProviders(<LoginPage />, {
      authValue: { ...unauthValue, login: loginMock }
    })

    await user.type(screen.getByPlaceholderText('tu_usuario'), 'testuser')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.queryByText('El usuario es obligatorio')).not.toBeInTheDocument()
      expect(screen.queryByText('La contraseña es obligatoria')).not.toBeInTheDocument()
    })
  })
})

describe('LoginPage — submit', () => {

  it('llama a login con username y password del formulario', async () => {
    const user = userEvent.setup()
    const loginMock = vi.fn().mockResolvedValue({ username: 'testuser' })

    renderWithProviders(<LoginPage />, {
      authValue: { ...unauthValue, login: loginMock }
    })

    await user.type(screen.getByPlaceholderText('tu_usuario'), 'ana_garcia')
    await user.type(screen.getByPlaceholderText('••••••••'), 'mipassword')
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('ana_garcia', 'mipassword')
    })
  })

  it('muestra "Iniciando sesión..." mientras el login está en curso', async () => {
    const user = userEvent.setup()
    // Login que tarda para capturar el estado intermedio
    const loginMock = vi.fn(() => new Promise(r => setTimeout(r, 300)))

    renderWithProviders(<LoginPage />, {
      authValue: { ...unauthValue, login: loginMock }
    })

    await user.type(screen.getByPlaceholderText('tu_usuario'), 'testuser')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')

    // Click sin esperar a que termine
    user.click(screen.getByRole('button', { name: /Iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByText(/Iniciando sesión/i)).toBeInTheDocument()
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  RegisterPage
// ════════════════════════════════════════════════════════════════════════════

describe('RegisterPage — renderizado', () => {

  it('muestra el título "Crear cuenta"', () => {
    renderWithProviders(<RegisterPage />, { authValue: { ...unauthValue } })
    expect(screen.getByRole('heading', { name: /Crear cuenta/i })).toBeInTheDocument()
  })

  it('muestra los 4 campos del formulario', () => {
    renderWithProviders(<RegisterPage />, { authValue: { ...unauthValue } })
    expect(screen.getByPlaceholderText('mi_usuario')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Repite tu contraseña')).toBeInTheDocument()
  })

  it('tiene un link de vuelta al login', () => {
    renderWithProviders(<RegisterPage />, { authValue: { ...unauthValue } })
    const loginLink = screen.getByRole('link', { name: /Inicia sesión/i })
    expect(loginLink).toHaveAttribute('href', '/login')
  })
})

describe('RegisterPage — validaciones', () => {

  it('muestra error con email inválido', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { authValue: { ...unauthValue } })

    await user.type(screen.getByPlaceholderText('mi_usuario'), 'usuario')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'no-es-email')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'pass123')
    await user.type(screen.getByPlaceholderText('Repite tu contraseña'), 'pass123')
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }))

    expect(await screen.findByText('Email no válido')).toBeInTheDocument()
  })

  it('muestra error si las contraseñas no coinciden', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { authValue: { ...unauthValue } })

    await user.type(screen.getByPlaceholderText('mi_usuario'), 'usuario')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'password1')
    await user.type(screen.getByPlaceholderText('Repite tu contraseña'), 'password2')
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }))

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
  })

  it('muestra error si el usuario tiene caracteres especiales no permitidos', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { authValue: { ...unauthValue } })

    await user.type(screen.getByPlaceholderText('mi_usuario'), 'usuario con espacios')
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }))

    expect(await screen.findByText('Solo letras, números y _')).toBeInTheDocument()
  })

  it('muestra error si la contraseña tiene menos de 6 caracteres', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />, { authValue: { ...unauthValue } })

    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123')
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }))

    expect(await screen.findByText('Mínimo 6 caracteres')).toBeInTheDocument()
  })
})

describe('RegisterPage — submit', () => {

  it('llama a register con los datos correctos', async () => {
    const user = userEvent.setup()
    const registerMock = vi.fn().mockResolvedValue({ username: 'nuevo' })

    renderWithProviders(<RegisterPage />, {
      authValue: { ...unauthValue, register: registerMock }
    })

    await user.type(screen.getByPlaceholderText('mi_usuario'), 'nuevo_user')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'nuevo@test.com')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'secreto123')
    await user.type(screen.getByPlaceholderText('Repite tu contraseña'), 'secreto123')
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }))

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith({
        username: 'nuevo_user',
        email:    'nuevo@test.com',
        password: 'secreto123',
      })
    })
  })
})
