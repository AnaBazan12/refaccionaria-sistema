import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { getReporteDiario, getReporteMensual } from '../services/reporte.service'

type Vista = 'diario' | 'mensual'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export default function Reportes() {
  const hoy = new Date()
  const [vista, setVista] = useState<Vista>('diario')
  const [fecha, setFecha] = useState(hoy.toISOString().split('T')[0])
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [datos, setDatos] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)
    // Limpiar datos anteriores para evitar conflictos de estructura entre vistas
    setDatos(null) 
    try {
      const res = vista === 'diario' 
        ? await getReporteDiario(fecha) 
        : await getReporteMensual(mes, anio)
      setDatos(res)
    } catch (error) {
      console.error("Error cargando reporte:", error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [vista, fecha, mes, anio])

  // ── Helpers de formato ───────────────────────────────────
  const fmt = (n: any) =>
    `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Preparación Segura de Datos para Gráficas ─────────────
  
  // 1. Ventas por tipo (Evita error si ventasPorTipo es null)
  const datosVentasTipo = datos?.refacciones?.ventasPorTipo
    ? Object.entries(datos.refacciones.ventasPorTipo).map(([tipo, d]: any) => ({
        tipo,
        Ventas: Number(d?.total || 0),
        Ganancia: Number(d?.ganancia || 0)
      }))
    : []

  // 2. Top 5 refacciones
  const datosTop10 = Array.isArray(datos?.refacciones?.top10)
    ? datos.refacciones.top10.slice(0, 5).map((r: any) => ({
        nombre: r.nombre?.length > 18 ? r.nombre.substring(0, 18) + '…' : r.nombre,
        Ventas: Number(r.total || 0),
        Ganancia: Number(r.ganancia || 0)
      }))
    : []

  // 3. Productividad Mecánicos
  const datosMecanicos = Array.isArray(datos?.taller?.productividadMecanicos)
    ? datos.taller.productividadMecanicos.map((m: any) => ({
        nombre: m.nombre || 'Sin nombre',
        Órdenes: m.ordenes || 0,
        'Mano de obra': Number(m.totalManoObra || 0)
      }))
    : []

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
          <p className="text-sm text-gray-500">Gestión de {vista === 'diario' ? 'día actual' : 'mes seleccionado'}</p>
        </div>

        <div className="flex bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
          {(['diario', 'mensual'] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                vista === v ? 'bg-gray-800 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {v === 'diario' ? '📅 Diario' : '📆 Mensual'}
            </button>
          ))}
        </div>
      </div>

      {/* Selectores */}
      <div className="flex items-center gap-3">
        {vista === 'diario' ? (
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        ) : (
          <div className="flex gap-2">
            <select value={mes} onChange={e => setMes(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
              {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p>Procesando datos...</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de Resumen Dinámicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vista === 'diario' ? (
              <>
                <Card label="Total del día" val={fmt(datos?.resumen?.granTotal)} color="green" />
                <Card label="Ganancia Refacciones" val={fmt(datos?.resumen?.totalGananciaRefacciones)} color="blue" />
                <Card label="Mano de Obra" val={fmt(datos?.resumen?.totalManoObra)} color="purple" />
                <Card label="Autos Entregados" val={datos?.taller?.ordenesEntregadas || 0} color="amber" />
              </>
            ) : (
              <>
                <Card label="Ingresos Totales" val={fmt(datos?.resumenGeneral?.granTotalIngresos)} color="green" />
                <Card label="Ganancia Refacciones" val={fmt(datos?.resumenGeneral?.gananciaRefacciones)} color="blue" />
                <Card label="Total Taller" val={fmt(datos?.resumenGeneral?.totalTaller)} color="purple" />
                <Card label="Utilidad Neta" val={fmt(datos?.resumenGeneral?.utilidadNeta)} color="teal" 
                      sub={`Margen: ${datos?.resumenGeneral?.margenPromedio || '0%'}`} />
              </>
            )}
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {datosVentasTipo.length > 0 && (
              <ChartContainer title="Ventas por Categoría">
                <BarChart data={datosVentasTipo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                  <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ganancia" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}

            {datosTop10.length > 0 && (
              <ChartContainer title="Top 5 Refacciones (Ventas)">
                <BarChart data={datosTop10} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
                  <XAxis type="number" hide />
                  <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="Ventas" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}

            {datosMecanicos.length > 0 && (
              <ChartContainer title="Productividad Mecánicos">
                <BarChart data={datosMecanicos}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value, name) => name === 'Mano de obra' ? fmt(value) : value} />
                  <Legend />
                  <Bar dataKey="Órdenes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Mano de obra" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
          
          {/* Aquí seguirían tus tablas de Detalle y Top 10 con la misma lógica de validación datos?.prop */}
        </>
      )}
    </div>
  )
}

// Componentes internos para limpieza visual
function Card({ label, val, color, sub }: any) {
  const colors: any = {
    green: 'bg-green-50 border-green-100 text-green-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[color] || 'bg-white'}`}>
      <div className="text-xs font-semibold uppercase opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{val}</div>
      {sub && <div className="text-xs mt-1 opacity-80">{sub}</div>}
    </div>
  )
}

function ChartContainer({ title, children }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}