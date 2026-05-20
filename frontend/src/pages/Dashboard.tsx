import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import { getDashboardData } from '../services/dashboard.service'

/* ─── tipos ──────────────────────────────────────────────────── */
interface DashboardData {
  hoy: {
    nuevasOrdenes: number
    enTaller: number
  }
  mes: {
    ingresos: string
    ingresosMesAnt: string
    crecimiento: string | null
    totalOrdenes: number
    entregadas: number
  }
  activas: {
    total: number
    porEstado: {
      RECIBIDO: number
      EN_PROCESO: number
      EN_ESPERA_REFACCION: number
      LISTO: number
    }
    lista: any[]
  }
  mecanicos: { nombre: string; ordenes: number; ingresos: number }[]
  ultimos7: { fecha: string; ingresos: number; label: string }[]
  ultimasOrdenes: any[]
  stockBajo: {
    id: string
    nombre: string
    codigo: string
    stockActual: number
    stockMinimo: number
    proveedor: string
  }[]
}

/* ─── helpers ─────────────────────────────────────────────────── */
const fmt = (n: any) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const estadoConfig: Record<string, { label: string; color: string; dot: string }> = {
  RECIBIDO:            { label: 'Recibidos',      color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  EN_PROCESO:          { label: 'En proceso',     color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  EN_ESPERA_REFACCION: { label: 'Espera refacción', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  LISTO:               { label: 'Listos',         color: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
}

/* ─── tarjeta de métrica ─────────────────────────────────────── */
function MetricCard({
  icono, titulo, valor, subtitulo, color, badge
}: {
  icono: string
  titulo: string
  valor: string | number
  subtitulo?: string
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple'
  badge?: { texto: string; positivo: boolean } | null
}) {
  const bg: Record<string, string> = {
    green:  'bg-green-50  border-green-100',
    blue:   'bg-blue-50   border-blue-100',
    yellow: 'bg-amber-50  border-amber-100',
    red:    'bg-red-50    border-red-100',
    purple: 'bg-purple-50 border-purple-100',
  }
  const text: Record<string, string> = {
    green:  'text-green-700',
    blue:   'text-blue-700',
    yellow: 'text-amber-700',
    red:    'text-red-700',
    purple: 'text-purple-700',
  }
  return (
    <div className={`rounded-xl border p-5 ${bg[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icono}</span>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            badge.positivo
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {badge.positivo ? '▲' : '▼'} {badge.texto}
          </span>
        )}
      </div>
      <div className={`text-3xl font-bold ${text[color]} mb-1`}>{valor}</div>
      <div className="text-sm font-medium text-gray-600">{titulo}</div>
      {subtitulo && <div className="text-xs text-gray-400 mt-0.5">{subtitulo}</div>}
    </div>
  )
}

/* ─── tooltip personalizado para la gráfica ─────────────────── */
function TooltipGrafica({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-blue-600 font-bold">{fmt(payload[0]?.value)}</p>
    </div>
  )
}

/* ─── página ─────────────────────────────────────────────────── */
export default function Dashboard() {
  const [datos, setDatos] = useState<DashboardData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardData()
      .then(setDatos)
      .catch(() => setError('No se pudieron cargar los datos'))
      .finally(() => setCargando(false))
  }, [])

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const mesActual = new Date().toLocaleDateString('es-MX', {
    month: 'long', year: 'numeric'
  })

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Cargando datos…</p>
      </div>
    )
  }

  if (error || !datos) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error || 'Error desconocido'}</p>
      </div>
    )
  }

  const { hoy: dHoy, mes, activas, mecanicos, ultimos7, ultimasOrdenes, stockBajo } = datos

  const badgeCrecimiento = mes.crecimiento !== null
    ? { texto: `${Math.abs(Number(mes.crecimiento))}% vs mes ant.`, positivo: Number(mes.crecimiento) >= 0 }
    : null

  return (
    <div className="p-6 space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm capitalize">{hoy}</p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-1 font-medium capitalize">
          📅 {mesActual}
        </span>
      </div>

      {/* ── Tarjetas de métricas ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icono="💰"
          titulo="Ingresos del mes"
          valor={fmt(mes.ingresos)}
          subtitulo={`${mes.entregadas} órdenes entregadas`}
          color="green"
          badge={badgeCrecimiento}
        />
        <MetricCard
          icono="🔧"
          titulo="Autos en taller"
          valor={activas.total}
          subtitulo={`${dHoy.nuevasOrdenes} nuevas hoy`}
          color="blue"
          badge={null}
        />
        <MetricCard
          icono="📋"
          titulo="Órdenes del mes"
          valor={mes.totalOrdenes}
          subtitulo={`${mes.entregadas} entregadas`}
          color="purple"
          badge={null}
        />
        <MetricCard
          icono="⚠️"
          titulo="Stock bajo"
          valor={stockBajo.length}
          subtitulo={stockBajo.length > 0 ? 'Piezas por surtir' : 'Inventario OK'}
          color={stockBajo.length > 0 ? 'red' : 'green'}
          badge={null}
        />
      </div>

      {/* ── Estados de órdenes activas ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(estadoConfig).map(([key, cfg]) => (
          <div key={key} className={`rounded-xl border p-4 ${cfg.color.split(' ')[0]} border-gray-100`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs font-medium text-gray-600">{cfg.label}</span>
            </div>
            <div className={`text-3xl font-bold ${cfg.color.split(' ')[1]}`}>
              {activas.porEstado[key as keyof typeof activas.porEstado]}
            </div>
          </div>
        ))}
      </div>

      {/* ── Gráfica + Mecánicos ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfica últimos 7 días */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-1">Ingresos — últimos 7 días</h2>
          <p className="text-xs text-gray-400 mb-4">Pagos registrados por día</p>
          {ultimos7.every(d => d.ingresos === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm flex-col gap-2">
              <span className="text-4xl">📊</span>
              Sin pagos en los últimos 7 días
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ultimos7} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<TooltipGrafica />} />
                <Bar
                  dataKey="ingresos"
                  name="Ingresos"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Productividad mecánicos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-1">Mecánicos del mes</h2>
          <p className="text-xs text-gray-400 mb-4">Órdenes entregadas</p>
          {mecanicos.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-300 text-sm flex-col gap-2">
              <span className="text-3xl">👷</span>
              Sin datos aún
            </div>
          ) : (
            <div className="space-y-3">
              {mecanicos.map((m, i) => {
                const max = mecanicos[0].ordenes
                const pct = max > 0 ? (m.ordenes / max) * 100 : 0
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <div key={m.nombre}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{medals[i] ?? '👷'}</span>
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                          {m.nombre}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-600">
                        {m.ordenes} <span className="font-normal text-gray-400 text-xs">órd.</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 text-right">{fmt(m.ingresos)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Autos en taller + Últimas órdenes ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Autos activos en taller */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">
            🔧 Autos en el taller ahora
          </h2>
          {activas.lista.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-300 text-sm flex-col gap-2">
              <span className="text-4xl">✅</span>
              No hay autos en el taller
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {activas.lista.map((o: any) => {
                const cfg = estadoConfig[o.estado]
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {o.vehiculo?.marca} {o.vehiculo?.modelo}
                        <span className="text-xs text-gray-400 font-mono ml-2">{o.vehiculo?.placa}</span>
                      </div>
                      <div className="text-xs text-gray-500">{o.cliente?.nombre}</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {cfg?.label ?? o.estado}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {o.mecanico?.nombre ?? 'Sin asignar'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Últimas órdenes creadas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">
            📋 Últimas órdenes
          </h2>
          {ultimasOrdenes.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-300 text-sm flex-col gap-2">
              <span className="text-4xl">📭</span>
              No hay órdenes aún
            </div>
          ) : (
            <div className="space-y-2">
              {ultimasOrdenes.map((o: any) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-400 font-bold">
                        #{o.numero ?? o.id.slice(0, 5)}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {o.cliente?.nombre}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {o.vehiculo?.marca} {o.vehiculo?.modelo} ·{' '}
                      {new Date(o.createdAt).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-700">{fmt(o.total)}</div>
                    <div className={`text-xs ${estadoConfig[o.estado]?.color?.split(' ')[1] ?? 'text-gray-400'}`}>
                      {estadoConfig[o.estado]?.label ?? o.estado}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Alerta stock bajo ────────────────────────────────── */}
      {stockBajo.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h2 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
            ⚠️ Piezas con stock bajo — necesitan surtirse
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
              {stockBajo.length}
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium text-xs">Código</th>
                  <th className="pb-2 font-medium text-xs">Pieza</th>
                  <th className="pb-2 font-medium text-xs">Stock</th>
                  <th className="pb-2 font-medium text-xs">Mínimo</th>
                  <th className="pb-2 font-medium text-xs">Proveedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stockBajo.map((r) => (
                  <tr key={r.id} className="text-gray-700">
                    <td className="py-2 font-mono text-xs text-gray-400">{r.codigo}</td>
                    <td className="py-2 font-medium">{r.nombre}</td>
                    <td className="py-2">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-xs font-bold">
                        {r.stockActual}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400 text-xs">{r.stockMinimo}</td>
                    <td className="py-2 text-gray-500 text-xs">{r.proveedor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
