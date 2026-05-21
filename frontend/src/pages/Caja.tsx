import { useEffect, useState, useRef } from 'react'
import { getResumenCaja, type ResumenCaja } from '../services/caja.service'

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

const fechaHoy = () => new Date().toISOString().slice(0, 10)

const METODO_LABEL: Record<string, string> = {
  EFECTIVO:      '💵 Efectivo',
  TARJETA:       '💳 Tarjeta',
  TRANSFERENCIA: '📲 Transferencia',
}
const METODO_COLOR: Record<string, string> = {
  EFECTIVO:      'bg-green-100  text-green-800',
  TARJETA:       'bg-blue-100   text-blue-800',
  TRANSFERENCIA: 'bg-purple-100 text-purple-800',
}
const TIPO_LABEL: Record<string, string> = {
  CONTADO:  'Contado',
  ANTICIPO: 'Anticipo',
  ABONO:    'Abono',
  CREDITO:  'Crédito',
}

export default function Caja() {
  const [fecha,    setFecha]    = useState(fechaHoy())
  const [resumen,  setResumen]  = useState<ResumenCaja | null>(null)
  const [cargando, setCargando] = useState(true)
  const [tab,      setTab]      = useState<'pagos' | 'ventas'>('pagos')
  const printRef = useRef<HTMLDivElement>(null)

  const cargar = async (f = fecha) => {
    setCargando(true)
    try {
      const data = await getResumenCaja(f)
      setResumen(data)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleFecha = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFecha(e.target.value)
    cargar(e.target.value)
  }

  const imprimir = () => window.print()

  if (cargando && !resumen) {
    return (
      <div className="p-6 text-center text-gray-400 py-16">
        <div className="text-4xl mb-3">🏦</div>
        Cargando corte...
      </div>
    )
  }

  const r = resumen!

  // Fecha legible
  const fechaLegible = new Date(`${r.fecha}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <>
      {/* ── Estilos de impresión ──────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #corte-caja, #corte-caja * { visibility: visible !important; }
          #corte-caja { position: fixed; inset: 0; padding: 24px; font-size: 12px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Corte de caja</h1>
            <p className="text-sm text-gray-500 mt-1 capitalize">{fechaLegible}</p>
          </div>
          <div className="flex items-center gap-3 no-print">
            <input
              type="date"
              value={fecha}
              max={fechaHoy()}
              onChange={handleFecha}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={imprimir}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900
                         text-white text-sm font-medium px-4 py-2 rounded-lg
                         transition-colors"
            >
              🖨️ Imprimir corte
            </button>
          </div>
        </div>

        <div id="corte-caja" ref={printRef} className="space-y-6">

          {/* ── Totales principales ───────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 bg-gradient-to-br from-gray-800 to-gray-900
                            rounded-xl p-5 text-white">
              <div className="text-xs font-medium uppercase tracking-wide
                              text-gray-400 mb-2">Total del día</div>
              <div className="text-3xl font-bold">${fmt(r.totalDia)}</div>
              <div className="text-xs text-gray-400 mt-1">
                {r.ordenesPagadas} orden{r.ordenesPagadas !== 1 ? 'es' : ''} · {r.pagos.length} pago{r.pagos.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💵</span>
                <span className="text-xs font-medium text-green-700 uppercase tracking-wide">Efectivo</span>
              </div>
              <div className="text-2xl font-bold text-green-800">
                ${fmt(r.porMetodo.EFECTIVO)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {r.porMetodo.EFECTIVO > 0
                  ? `${((r.porMetodo.EFECTIVO / r.totalDia) * 100).toFixed(0)}% del total`
                  : 'Sin movimientos'}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💳</span>
                <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Tarjeta</span>
              </div>
              <div className="text-2xl font-bold text-blue-800">
                ${fmt(r.porMetodo.TARJETA)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {r.porMetodo.TARJETA > 0
                  ? `${((r.porMetodo.TARJETA / r.totalDia) * 100).toFixed(0)}% del total`
                  : 'Sin movimientos'}
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📲</span>
                <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Transferencia</span>
              </div>
              <div className="text-2xl font-bold text-purple-800">
                ${fmt(r.porMetodo.TRANSFERENCIA)}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {r.porMetodo.TRANSFERENCIA > 0
                  ? `${((r.porMetodo.TRANSFERENCIA / r.totalDia) * 100).toFixed(0)}% del total`
                  : 'Sin movimientos'}
              </div>
            </div>
          </div>

          {/* ── Desglose por tipo + ventas mostrador ──────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Por tipo de pago */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                📋 Desglose por tipo de pago
              </h2>
              <div className="space-y-3">
                {(Object.entries(r.porTipo) as [string, number][])
                  .filter(([, v]) => v > 0)
                  .map(([tipo, monto]) => (
                    <div key={tipo} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                        <span className="text-sm text-gray-700">{TIPO_LABEL[tipo] ?? tipo}</span>
                      </div>
                      <span className="font-semibold text-gray-800">${fmt(monto)}</span>
                    </div>
                  ))
                }
                {Object.values(r.porTipo).every(v => v === 0) && (
                  <p className="text-sm text-gray-400">Sin pagos registrados</p>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Subtotal órdenes</span>
                  <span className="font-bold text-gray-800">${fmt(r.totalPagosOrdenes)}</span>
                </div>
              </div>
            </div>

            {/* Ventas mostrador */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                🏪 Ventas mostrador del día
              </h2>
              {r.ventas.length === 0 ? (
                <p className="text-sm text-gray-400">Sin ventas mostrador hoy</p>
              ) : (
                <div className="space-y-2">
                  {r.ventas.slice(0, 5).map(v => (
                    <div key={v.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-800 font-medium">{v.refaccion}</span>
                        <span className="text-gray-400 ml-2">×{v.cantidad}</span>
                      </div>
                      <span className="font-semibold text-gray-700">${fmt(v.subtotal)}</span>
                    </div>
                  ))}
                  {r.ventas.length > 5 && (
                    <p className="text-xs text-gray-400 text-center">
                      +{r.ventas.length - 5} más — ver en pestaña Ventas
                    </p>
                  )}
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="text-sm font-semibold text-gray-600">Subtotal mostrador</span>
                    <span className="font-bold text-gray-800">${fmt(r.totalVentasMostrador)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabla detallada ───────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-gray-200 no-print">
              <button
                onClick={() => setTab('pagos')}
                className={`px-5 py-3 text-sm font-medium transition-colors
                  ${tab === 'pagos'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                    : 'text-gray-500 hover:text-gray-700'}`}
              >
                Pagos de órdenes ({r.pagos.length})
              </button>
              <button
                onClick={() => setTab('ventas')}
                className={`px-5 py-3 text-sm font-medium transition-colors
                  ${tab === 'ventas'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                    : 'text-gray-500 hover:text-gray-700'}`}
              >
                Ventas mostrador ({r.ventas.length})
              </button>
            </div>

            {tab === 'pagos' ? (
              r.pagos.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">💸</div>
                  <p>Sin pagos registrados en esta fecha</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Hora</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Orden</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cliente / Vehículo</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Método</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Monto</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 no-print">Registró</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {r.pagos.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                            {hora(p.hora)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-gray-600">
                              #{p.orden.numero}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{p.orden.cliente}</div>
                            <div className="text-xs text-gray-400">{p.orden.vehiculo}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              {TIPO_LABEL[p.tipo] ?? p.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                              ${METODO_COLOR[p.metodoPago] ?? 'bg-gray-100 text-gray-700'}`}>
                              {METODO_LABEL[p.metodoPago] ?? p.metodoPago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            ${fmt(p.monto)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 no-print">
                            {p.registradoPor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-600">
                          Total pagos de órdenes
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 text-base">
                          ${fmt(r.totalPagosOrdenes)}
                        </td>
                        <td className="no-print" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            ) : (
              r.ventas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">🏪</div>
                  <p>Sin ventas mostrador en esta fecha</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Hora</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Refacción</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Cant.</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Precio unit.</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Subtotal</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Ganancia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {r.ventas.map(v => (
                        <tr key={v.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                            {hora(v.hora)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{v.refaccion}</div>
                            <div className="text-xs text-gray-400 font-mono">{v.codigo}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{v.cantidad}</td>
                          <td className="px-4 py-3 text-right text-gray-700">${fmt(v.precioUnit)}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            ${fmt(v.subtotal)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700">
                            ${fmt(v.ganancia)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-600">
                          Total ventas mostrador
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 text-base">
                          ${fmt(r.totalVentasMostrador)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-700 text-base">
                          ${fmt(r.ventas.reduce((s, v) => s + v.ganancia, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>

          {/* ── Firma de cierre (para impresión) ──────────── */}
          <div className="hidden print:block border-t border-gray-300 pt-6 mt-8">
            <div className="grid grid-cols-2 gap-16 text-center text-sm text-gray-600">
              <div>
                <div className="border-t border-gray-400 pt-2 mt-12">
                  Elaboró / Responsable de caja
                </div>
              </div>
              <div>
                <div className="border-t border-gray-400 pt-2 mt-12">
                  Visto bueno / Administración
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
