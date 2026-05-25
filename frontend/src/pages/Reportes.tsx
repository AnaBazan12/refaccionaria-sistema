import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import {
  getReporteDiario, getReporteMensual,
  descargarPdfDiario, descargarPdfMensual
} from '../services/reporte.service'
import * as XLSX from 'xlsx'

type Vista = 'diario' | 'mensual'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  MOSTRADOR: { label: '🏪 Mostrador', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100'    },
  TALLER:    { label: '🔧 Taller',    color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
  MAYOREO:   { label: '📦 Mayoreo',   color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100'   },
}

const ESTADO_LABEL: Record<string, string> = {
  RECIBIDO:            'Recibido',
  EN_PROCESO:          'En proceso',
  EN_ESPERA_REFACCION: 'Espera refacción',
  LISTO:               'Listo',
  ENTREGADO:           'Entregado',
}

const fmt = (n: any) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* ── Tarjeta de métrica ─────────────────────────────────────── */
function Card({ label, val, sub, color }: {
  label: string; val: any; sub?: string
  color: 'green' | 'blue' | 'purple' | 'amber' | 'teal' | 'rose' | 'emerald' | 'gray'
}) {
  const styles: Record<string, string> = {
    green:   'bg-green-50   border-green-100   text-green-700',
    blue:    'bg-blue-50    border-blue-100    text-blue-700',
    purple:  'bg-purple-50  border-purple-100  text-purple-700',
    amber:   'bg-amber-50   border-amber-100   text-amber-700',
    teal:    'bg-teal-50    border-teal-100    text-teal-700',
    rose:    'bg-rose-50    border-rose-100    text-rose-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    gray:    'bg-gray-50    border-gray-200    text-gray-700',
  }
  return (
    <div className={`border rounded-xl p-5 ${styles[color]}`}>
      <div className="text-xs font-semibold uppercase opacity-60 tracking-wide mb-2">{label}</div>
      <div className="text-2xl font-bold">{val}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  )
}

/* ── Sección con título ──────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}

/* ── Contenedor de gráfica ───────────────────────────────────── */
function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-semibold text-gray-700 mb-4 text-sm">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        {children as any}
      </ResponsiveContainer>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════ */
export default function Reportes() {
  const hoy  = new Date()
  const [vista,    setVista]    = useState<Vista>('diario')
  const [fecha,    setFecha]    = useState(hoy.toISOString().split('T')[0])
  const [mes,      setMes]      = useState(hoy.getMonth() + 1)
  const [anio,     setAnio]     = useState(hoy.getFullYear())
  const [datos,         setDatos]         = useState<any>(null)
  const [cargando,      setCargando]      = useState(true)
  const [exportando,    setExportando]    = useState(false)

  // ── Exportar PDF ──────────────────────────────────────────────
  const handlePdf = async () => {
    setExportando(true)
    try {
      if (vista === 'diario') await descargarPdfDiario(fecha)
      else                    await descargarPdfMensual(mes, anio)
    } finally { setExportando(false) }
  }

  // ── Exportar Excel ────────────────────────────────────────────
  const handleExcel = () => {
    if (!datos) return
    const wb = XLSX.utils.book_new()

    if (vista === 'diario') {
      // Hoja 1: Ventas de refacciones
      const refDatos = (datos.refacciones?.detalle ?? []).map((v: any) => ({
        'Hora':       new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        'Refacción':  v.refaccion?.nombre ?? '',
        'Código':     v.refaccion?.codigo ?? '',
        'Tipo':       v.tipoVenta,
        'Cantidad':   v.cantidad,
        'Precio':     Number(v.precioUnitario),
        'Subtotal':   Number(v.subtotal),
        'Ganancia':   Number(v.ganancia),
        'Vendedor':   v.usuario?.nombre ?? '',
      }))
      if (refDatos.length) {
        const ws = XLSX.utils.json_to_sheet(refDatos)
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas Refacciones')
      }

      // Hoja 2: Órdenes del taller
      const tallerDatos = (datos.taller?.detalle ?? []).map((o: any) => ({
        'Cliente':    o.cliente?.nombre ?? '',
        'Vehículo':   `${o.vehiculo?.marca} ${o.vehiculo?.modelo}`,
        'Placa':      o.vehiculo?.placa ?? '',
        'Mecánico':   o.mecanico?.nombre ?? '',
        'Mano obra':  Number(o.totalManoObra),
        'Refacciones': Number(o.totalRefacciones),
        'Total':      Number(o.total),
      }))
      if (tallerDatos.length) {
        const ws = XLSX.utils.json_to_sheet(tallerDatos)
        XLSX.utils.book_append_sheet(wb, ws, 'Taller')
      }

      XLSX.writeFile(wb, `reporte-diario-${fecha}.xlsx`)
    } else {
      // Hoja 1: Top 10 refacciones
      const top10 = (datos.refacciones?.top10 ?? []).map((r: any, i: number) => ({
        '#':          i + 1,
        'Refacción':  r.nombre,
        'Código':     r.codigo,
        'Piezas':     r.cantidad,
        'Total ventas': Number(r.total),
        'Ganancia':   Number(r.ganancia),
      }))
      if (top10.length) {
        const ws = XLSX.utils.json_to_sheet(top10)
        XLSX.utils.book_append_sheet(wb, ws, 'Top Refacciones')
      }

      // Hoja 2: Mecánicos
      const mecanicos = (datos.taller?.productividadMecanicos ?? []).map((m: any) => ({
        'Mecánico':    m.nombre,
        'Órdenes':     m.ordenes,
        'Mano de obra': Number(m.totalManoObra),
      }))
      if (mecanicos.length) {
        const ws = XLSX.utils.json_to_sheet(mecanicos)
        XLSX.utils.book_append_sheet(wb, ws, 'Mecánicos')
      }

      // Hoja 3: Resumen general
      const rg = datos.resumenGeneral ?? {}
      const resumen = [
        { 'Concepto': 'Ingresos totales',    'Valor': Number(rg.granTotalIngresos)   },
        { 'Concepto': 'Total taller',        'Valor': Number(rg.totalTaller)         },
        { 'Concepto': 'Ventas refacciones',  'Valor': Number(rg.totalRefacciones)    },
        { 'Concepto': 'Ganancia refacciones','Valor': Number(rg.gananciaRefacciones) },
        { 'Concepto': 'Total compras',       'Valor': Number(rg.totalCompras)        },
        { 'Concepto': 'Utilidad neta',       'Valor': Number(rg.utilidadNeta)        },
      ]
      const ws = XLSX.utils.json_to_sheet(resumen)
      XLSX.utils.book_append_sheet(wb, ws, 'Resumen')

      const nombreMes = MESES[mes - 1]
      XLSX.writeFile(wb, `reporte-mensual-${nombreMes}-${anio}.xlsx`)
    }
  }

  const cargar = async () => {
    setCargando(true)
    setDatos(null)
    try {
      const res = vista === 'diario'
        ? await getReporteDiario(fecha)
        : await getReporteMensual(mes, anio)
      setDatos(res)
    } catch (e) {
      console.error('Error cargando reporte:', e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [vista, fecha, mes, anio])

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
          <p className="text-sm text-gray-500">
            {vista === 'diario' ? 'Resumen del día' : 'Resumen mensual'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle diario / mensual */}
          <div className="flex bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
            {(['diario', 'mensual'] as Vista[]).map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all
                  ${vista === v
                    ? 'bg-gray-800 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {v === 'diario' ? '📅 Diario' : '📆 Mensual'}
              </button>
            ))}
          </div>

          {/* Botones de exportación */}
          {!cargando && datos && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePdf}
                disabled={exportando}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                           bg-red-600 hover:bg-red-700 text-white rounded-lg
                           disabled:opacity-50 transition-colors"
              >
                {exportando ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>📄</span>
                )}
                PDF
              </button>
              <button
                onClick={handleExcel}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                           bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg
                           transition-colors"
              >
                <span>📊</span>
                Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Selector de fecha ────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {vista === 'diario' ? (
          <input
            type="date" value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          />
        ) : (
          <div className="flex gap-2">
            <select value={mes} onChange={e => setMes(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i)
                .map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>

      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
          <p>Procesando datos...</p>
        </div>
      ) : vista === 'diario' ? (
        <ReporteDiario datos={datos} />
      ) : (
        <ReporteMensual datos={datos} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   REPORTE DIARIO
═══════════════════════════════════════════════════════════════ */
function ReporteDiario({ datos }: { datos: any }) {
  if (!datos) return <Empty />

  const refacciones = datos.refacciones ?? {}
  const taller      = datos.taller      ?? {}
  const resumen     = datos.resumen     ?? {}

  const tieneVentas = Number(resumen.granTotal) > 0 ||
    refacciones.detalle?.length > 0 || taller.ordenesEntregadas > 0

  if (!tieneVentas) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-3">📭</div>
        <div className="font-medium">Sin actividad registrada este día</div>
      </div>
    )
  }

  // Ventas de refacciones agrupadas por tipo para la vista
  const ventasPorTipo = (refacciones.detalle ?? []).reduce((acc: any, v: any) => {
    if (!acc[v.tipoVenta]) acc[v.tipoVenta] = { total: 0, ganancia: 0, items: [] }
    acc[v.tipoVenta].total    += Number(v.subtotal)
    acc[v.tipoVenta].ganancia += Number(v.ganancia)
    acc[v.tipoVenta].items.push(v)
    return acc
  }, {})

  return (
    <div className="space-y-8">

      {/* ── Resumen general ─────────────────────────────────── */}
      <Section title="Resumen del día">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="Total del día"         val={fmt(resumen.granTotal)}                color="green"  />
          <Card label="Ganancia refacciones"  val={fmt(resumen.totalGananciaRefacciones)} color="emerald"/>
          <Card label="Mano de obra"          val={fmt(resumen.totalManoObra)}            color="purple" />
          <Card label="Autos entregados"      val={taller.ordenesEntregadas ?? 0}         color="blue"   />
        </div>
      </Section>

      {/* ── Ventas de refacciones ────────────────────────────── */}
      {refacciones.detalle?.length > 0 && (
        <Section title="🏪 Ventas de refacciones">
          {/* Mini tarjetas por tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
              const d = ventasPorTipo[tipo]
              if (!d) return null
              return (
                <div key={tipo} className={`border rounded-xl p-4 ${cfg.bg}`}>
                  <div className={`text-sm font-semibold mb-2 ${cfg.color}`}>{cfg.label}</div>
                  <div className="text-xl font-bold text-gray-800">{fmt(d.total)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Ganancia: {fmt(d.ganancia)} · {d.items.length} venta{d.items.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tabla de detalle */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
              Detalle de ventas
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium">Refacción</th>
                    <th className="text-left px-3 py-3 font-medium">Tipo</th>
                    <th className="text-center px-3 py-3 font-medium">Cant.</th>
                    <th className="text-right px-3 py-3 font-medium">Precio</th>
                    <th className="text-right px-3 py-3 font-medium">Subtotal</th>
                    <th className="text-right px-5 py-3 font-medium">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {refacciones.detalle.map((v: any) => {
                    const tipoCfg = TIPO_CONFIG[v.tipoVenta]
                    return (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-800">{v.refaccion?.nombre}</div>
                          <div className="text-xs text-gray-400 font-mono">{v.refaccion?.codigo}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${tipoCfg?.bg ?? ''} ${tipoCfg?.color ?? ''}`}>
                            {tipoCfg?.label ?? v.tipoVenta}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">×{v.cantidad}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{fmt(v.precioUnitario)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-800">{fmt(v.subtotal)}</td>
                        <td className="px-5 py-3 text-right text-emerald-600 font-medium">+{fmt(v.ganancia)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                    <td colSpan={4} className="px-5 py-3 text-gray-600">Total refacciones</td>
                    <td className="px-3 py-3 text-right text-gray-800">
                      {fmt(Number(refacciones.totalMostrador) + Number(refacciones.totalTaller) + Number(refacciones.totalMayoreo))}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-600">+{fmt(refacciones.ganancia)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Section>
      )}

      {/* ── Órdenes del taller entregadas ─────────────────── */}
      {taller.detalle?.length > 0 && (
        <Section title="🔧 Taller — órdenes entregadas">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-1">
            <Card label="Total taller"    val={fmt(taller.total)}        color="purple" />
            <Card label="Mano de obra"    val={fmt(taller.totalManoObra)} color="blue"  />
            <Card label="Refacciones OT"  val={fmt(taller.totalRefacciones)} color="gray" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 font-medium">Cliente</th>
                    <th className="text-left px-3 py-3 font-medium">Vehículo</th>
                    <th className="text-left px-3 py-3 font-medium">Mecánico</th>
                    <th className="text-right px-3 py-3 font-medium">Mano obra</th>
                    <th className="text-right px-5 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {taller.detalle.map((o: any) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{o.cliente?.nombre ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {o.vehiculo?.marca} {o.vehiculo?.modelo}
                        <span className="text-xs text-gray-400 font-mono ml-1">{o.vehiculo?.placa}</span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">{o.mecanico?.nombre ?? '—'}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{fmt(o.totalManoObra)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">{fmt(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   REPORTE MENSUAL
═══════════════════════════════════════════════════════════════ */
function ReporteMensual({ datos }: { datos: any }) {
  if (!datos) return <Empty />

  const rg          = datos.resumenGeneral ?? {}
  const taller      = datos.taller         ?? {}
  const refacciones = datos.refacciones    ?? {}
  const compras     = datos.compras        ?? {}

  // Gráfica ventas por tipo
  const datosVentasTipo = refacciones.ventasPorTipo
    ? Object.entries(refacciones.ventasPorTipo).map(([tipo, d]: any) => ({
        tipo: TIPO_CONFIG[tipo]?.label ?? tipo,
        Ventas:   Number(d.total   || 0),
        Ganancia: Number(d.ganancia || 0),
      }))
    : []

  // Top 5 para gráfica horizontal
  const datosTop5 = (refacciones.top10 ?? []).slice(0, 5).map((r: any) => ({
    nombre: r.nombre?.length > 20 ? r.nombre.substring(0, 20) + '…' : r.nombre,
    Ventas:   Number(r.total   || 0),
    Ganancia: Number(r.ganancia || 0),
  }))

  // Gráfica mecánicos
  const datosMecanicos = (taller.productividadMecanicos ?? []).map((m: any) => ({
    nombre:        m.nombre ?? '—',
    Órdenes:       m.ordenes ?? 0,
    'Mano de obra': Number(m.totalManoObra || 0),
  }))

  return (
    <div className="space-y-8">

      {/* ── Resumen general ─────────────────────────────────── */}
      <Section title="Resumen del mes">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="Ingresos totales"    val={fmt(rg.granTotalIngresos)}   color="green"
                sub={`Taller + Mostrador`} />
          <Card label="Ganancia refacciones" val={fmt(rg.gananciaRefacciones)} color="emerald"
                sub={`Margen: ${rg.margenPromedio ?? '0%'}`} />
          <Card label="Total taller"         val={fmt(rg.totalTaller)}         color="blue"   />
          <Card label="Utilidad neta"        val={fmt(rg.utilidadNeta)}        color="teal"
                sub={`Compras: ${fmt(rg.totalCompras)}`} />
        </div>
      </Section>

      {/* ── Sección TALLER ──────────────────────────────────── */}
      <Section title="🔧 Taller mecánico">
        {/* Chips de estado */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(taller.ordenesPorEstado ?? {}).map(([estado, qty]: any) => (
            <div key={estado} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-gray-800">{qty}</div>
              <div className="text-xs text-gray-500 mt-0.5">{ESTADO_LABEL[estado] ?? estado}</div>
            </div>
          ))}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{taller.autosAtendidos ?? 0}</div>
            <div className="text-xs text-blue-500 mt-0.5">Autos únicos</div>
          </div>
        </div>

        {/* Gráfica mecánicos */}
        {datosMecanicos.length > 0 && (
          <ChartBox title="Productividad mecánicos">
            <BarChart data={datosMecanicos}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any, n: string) =>
                n === 'Mano de obra' ? fmt(v) : [v, n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Órdenes"      fill="#f59e0b" radius={[4,4,0,0]} />
              <Bar dataKey="Mano de obra" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ChartBox>
        )}

        {/* Resumen financiero taller */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card label="Total taller"         val={fmt(rg.totalTaller)}             color="purple" />
          <Card label="Mano de obra"         val={fmt(taller.ingresosManoObra)}    color="blue"   />
          <Card label="Refacciones en OT"    val={fmt(taller.ingresosRefacciones)} color="gray"   />
        </div>
      </Section>

      {/* ── Sección REFACCIONES ─────────────────────────────── */}
      <Section title="🏪 Ventas de refacciones">
        {/* Tarjetas totales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card label="Total ventas"   val={fmt(refacciones.totalVentas)}   color="emerald" />
          <Card label="Ganancia total" val={fmt(refacciones.totalGanancia)} color="green"   />
          <Card label="Tickets / ventas"
                val={(refacciones.top10 ?? []).reduce((s: number, r: any) => s + (r.cantidad ?? 0), 0)}
                color="blue" />
        </div>

        {/* Gráficas */}
        {(datosVentasTipo.length > 0 || datosTop5.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {datosVentasTipo.length > 0 && (
              <ChartBox title="Ventas por canal">
                <BarChart data={datosVentasTipo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Ventas"   fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="Ganancia" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ChartBox>
            )}

            {datosTop5.length > 0 && (
              <ChartBox title="Top 5 refacciones más vendidas">
                <BarChart data={datosTop5} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="nombre" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Ventas"   fill="#6366f1" radius={[0,4,4,0]} />
                  <Bar dataKey="Ganancia" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ChartBox>
            )}
          </div>
        )}

        {/* Tabla top 10 completa */}
        {refacciones.top10?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
              Top 10 refacciones del mes
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="text-center px-4 py-3 font-medium w-10">#</th>
                    <th className="text-left px-4 py-3 font-medium">Refacción</th>
                    <th className="text-center px-3 py-3 font-medium">Piezas</th>
                    <th className="text-right px-3 py-3 font-medium">Ventas</th>
                    <th className="text-right px-4 py-3 font-medium">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {refacciones.top10.map((r: any, i: number) => (
                    <tr key={r.codigo} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold w-6 h-6 rounded-full inline-flex
                          items-center justify-center
                          ${i === 0 ? 'bg-amber-100 text-amber-700'
                            : i === 1 ? 'bg-gray-200 text-gray-600'
                            : i === 2 ? 'bg-orange-100 text-orange-600'
                            : 'text-gray-400'}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{r.nombre}</div>
                        <div className="text-xs text-gray-400 font-mono">{r.codigo}</div>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 font-medium">{r.cantidad}</td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-800">{fmt(r.total)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">+{fmt(r.ganancia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* ── Sección COMPRAS ─────────────────────────────────── */}
      {(compras.totalEntradas > 0 || Number(compras.totalGastado) > 0) && (
        <Section title="🛒 Compras del mes">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card label="Entradas registradas" val={compras.totalEntradas ?? 0}      color="amber"  />
            <Card label="Total gastado"         val={fmt(compras.totalGastado)}       color="rose"   />
            <Card label="Proveedores únicos"
                  val={(compras.porProveedor ?? []).length}                           color="gray"   />
          </div>

          {/* Por proveedor */}
          {compras.porProveedor?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
                Compras por proveedor
              </div>
              <div className="divide-y divide-gray-100">
                {compras.porProveedor.map((p: any) => (
                  <div key={p.nombre}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-800">{p.nombre}</div>
                      <div className="text-xs text-gray-400">
                        {p.compras} entrada{p.compras !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="font-bold text-gray-800">{fmt(p.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

    </div>
  )
}

function Empty() {
  return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-5xl mb-3">📊</div>
      <div className="font-medium">Sin datos para mostrar</div>
    </div>
  )
}
