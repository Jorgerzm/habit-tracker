/**
 * src/__tests__/components/WeeklyChart.test.jsx
 *
 * Tests del gráfico de barras semanal (Recharts).
 *
 * Desafío de testing con Recharts:
 *   Recharts renderiza SVG, no elementos HTML semánticos.
 *   No podemos usar getByRole('bar') ni similares.
 *   Estrategia: verificar que:
 *   (a) El contenedor SVG existe (el gráfico se renderizó).
 *   (b) Los labels del eje X (días) están presentes como texto.
 *   (c) Con datos vacíos, el componente devuelve null.
 *
 * Por qué no mockear Recharts:
 *   Mockear la librería solo verificaría que la pasamos los props correctos,
 *   no que el componente la usa bien. Con un render real detectamos si
 *   accidentalmente pasamos datos en formato incorrecto.
 *
 * Nota sobre ResizeObserver:
 *   Recharts usa ResizeObserver para adaptar el gráfico al contenedor.
 *   setup.js lo mockea con vi.fn() para evitar errores en jsdom.
 */

import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import WeeklyChart from '../../components/dashboard/WeeklyChart'
import { renderWithProviders, buildDashboardStats } from '../../test/utils.jsx'

// ════════════════════════════════════════════════════════════════════════════
//  Renderizado
// ════════════════════════════════════════════════════════════════════════════

describe('WeeklyChart — renderizado', () => {

  it('no renderiza nada si weeklyData está vacío', () => {
    const { container } = renderWithProviders(<WeeklyChart weeklyData={[]} />)
    // El componente devuelve null con datos vacíos
    expect(container.firstChild).toBeNull()
  })

  it('renderiza un SVG cuando hay datos', () => {
    const { weeklyData } = buildDashboardStats()
    const { container } = renderWithProviders(<WeeklyChart weeklyData={weeklyData} />)

    // Recharts crea un elemento SVG en el DOM
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('muestra las etiquetas de los 7 días de la semana', () => {
    const { weeklyData } = buildDashboardStats()
    renderWithProviders(<WeeklyChart weeklyData={weeklyData} />)

    // Los builders en utils.jsx usan 'Lun', 'Mar', ... (capitalizados)
    for (const label of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('no renderiza nada con un array null/undefined', () => {
    // Por defecto weeklyData = [] según la prop default del componente
    const { container } = renderWithProviders(<WeeklyChart />)
    expect(container.firstChild).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  Datos
// ════════════════════════════════════════════════════════════════════════════

describe('WeeklyChart — datos', () => {

  it('acepta datos con diferentes totales sin lanzar error', () => {
    const weeklyData = [
      { date: '2024-06-10', dayLabel: 'Lun', completed: 3, total: 5 },
      { date: '2024-06-11', dayLabel: 'Mar', completed: 0, total: 0 },  // sin hábitos ese día
      { date: '2024-06-12', dayLabel: 'Mié', completed: 5, total: 5 },
    ]

    expect(() => {
      renderWithProviders(<WeeklyChart weeklyData={weeklyData} />)
    }).not.toThrow()
  })

  it('el contenedor tiene la altura correcta (h-48 = 192px)', () => {
    const { weeklyData } = buildDashboardStats()
    const { container } = renderWithProviders(<WeeklyChart weeklyData={weeklyData} />)

    const wrapper = container.firstChild
    expect(wrapper.className).toMatch(/h-48/)
  })
})
