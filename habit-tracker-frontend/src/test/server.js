/**
 * src/test/server.js
 *
 * Instancia del servidor MSW para tests en Node.js.
 *
 * En tests (jsdom/Node), MSW usa setupServer() en lugar de
 * setupWorker() (que es para el Service Worker del navegador).
 *
 * Ciclo de vida:
 *   beforeAll  → server.listen()   : arranca antes de todos los tests
 *   afterEach  → server.resetHandlers(): restaura handlers por defecto
 *                                         (limpia server.use() temporales)
 *   afterAll   → server.close()   : cierra al terminar todos los tests
 *
 * Este patrón está en setup.js para que aplique a todos los archivos
 * de test automáticamente.
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
