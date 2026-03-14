import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { isToday, parseISO } from 'date-fns'

/**
 * Gráfico de barras semanal para el Dashboard.
 *
 * Recibe weeklyData del endpoint /api/habits/dashboard:
 *   [{ date, dayLabel, completed, total }, ...]
 *
 * Las barras se colorean según el % de cumplimiento:
 *   ≥ 80% → esmeralda
 *   ≥ 50% → ámbar
 *   < 50% → rojo suave
 *
 * El día de hoy tiene borde ámbar en la barra.
 */
export default function WeeklyChart({ weeklyData = [] }) {
  if (!weeklyData.length) return null

  const data = weeklyData.map(d => ({
    ...d,
    pct: d.total > 0 ? Math.round(d.completed / d.total * 100) : 0,
    isToday: isToday(parseISO(d.date)),
  }))

  const getColor = (pct, isCurrentDay) => {
    if (isCurrentDay) return '#d97706'   // ámbar para hoy
    if (pct >= 80)    return '#059669'   // esmeralda
    if (pct >= 50)    return '#d97706'   // ámbar
    if (pct > 0)      return '#f59e0b'   // ámbar claro
    return '#e7e5e4'                      // gris: sin datos
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-white border shadow-lg rounded-xl px-3 py-2 text-xs"
           style={{ borderColor: 'var(--border)' }}>
        <p className="font-medium text-stone-700 capitalize">{label}</p>
        <p className="text-stone-500 mt-0.5">
          {d.completed} de {d.total} hábitos
          {d.total > 0 && <span className="text-stone-700 font-medium"> ({d.pct}%)</span>}
        </p>
      </div>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
          <CartesianGrid vertical={false} stroke="#f0ede8" />
          <XAxis
            dataKey="dayLabel"
            tick={{ fontSize: 11, fill: '#78716c', fontFamily: 'DM Sans, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#a8a29e', fontFamily: 'DM Sans, sans-serif' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,.03)' }} />
          <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getColor(entry.pct, entry.isToday)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
