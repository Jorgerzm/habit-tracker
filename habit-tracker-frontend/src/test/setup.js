/**
 * src/test/setup.js
 * Ejecutado antes de CADA archivo de test.
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, afterAll, beforeAll, vi } from 'vitest'
import { server } from './server'

// ── React Testing Library: limpiar DOM tras cada test ───────────────────────
afterEach(cleanup)

// ── MSW: ciclo de vida del servidor mock ────────────────────────────────────
// onUnhandledRequest: 'warn' → avisa si un test hace una petición
//                              que no tiene handler. Útil para detectar
//                              peticiones inesperadas sin romper los tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())   // restaura handlers por defecto
afterAll (() => server.close())

// ── Mocks de APIs del navegador ausentes en jsdom ───────────────────────────

global.IntersectionObserver = vi.fn(() => ({
  observe:    vi.fn(),
  unobserve:  vi.fn(),
  disconnect: vi.fn(),
}))

global.ResizeObserver = vi.fn(() => ({
  observe:    vi.fn(),
  unobserve:  vi.fn(),
  disconnect: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(query => ({
    matches: false,
    media:   query,
    onchange: null,
    addListener:         vi.fn(),
    removeListener:      vi.fn(),
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent:       vi.fn(),
  })),
})

// Silenciar errores de consola esperados (ej: errores de validación en tests)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    // Suprimir warnings de React sobre act() en tests
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return
    originalError(...args)
  }
})
afterAll(() => { console.error = originalError })
