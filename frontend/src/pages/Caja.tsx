import { useEffect, useState, useRef } from 'react'
import { getResumenCaja, registrarGasto, eliminarGasto, type ResumenCaja } from '../services/caja.service'

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

// México = UTC-6 permanente desde 2023
const fechaHoy = () => {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

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

const CATEGORIA_LABEL: Record<string, string> = {
  REFACCIONES: '🔩 Refacciones',
  NOMINA:      '👷 Nómina',
  SERVICIOS:   '🛠️ Servicios',
  OTROS:       '📦 Otros',
}
const CATEGORIA_COLOR: Record<string, string> = {
  REFACCIONES: 'bg-blue-100   text-blue-800',
  NOMINA:      'bg-purple-100 text-purple-800',
  SERVICIOS:   'bg-amber-100  text-amber-800',
  OTROS:       'bg-gray-100   text-gray-700',
}

const gastoFormVacio = { concepto: '', monto: '', categoria: 'OTROS', metodoPago: 'EFECTIVO', notas: '' }

export default function Caja() {
  const [fecha,        setFecha]        = useState(fechaHoy())
  const [resumen,      setResumen]      = useState<ResumenCaja | null>(null)
  const [cargando,     setCargando]     = useState(true)
  const [errorMsg,     setErrorMsg]     = useState('')
  const [tab,          setTab]          = useState<'pagos' | 'ventas' | 'gastos'>('pagos')
  const [modalGasto,   setModalGasto]   = useState(false)
  const [gastoForm,    setGastoForm]    = useState(gastoFormVacio)
  const [guardando,    setGuardando]    = useState(false)
  const [gastoError,   setGastoError]   = useState('')
  const [confirmElim,  setConfirmElim]  = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const cargar = async (f = fecha) => {
    setCargando(true)
    setErrorMsg('')
    try {
      const data = await getResumenCaja(f)
      setResumen(data)
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.mensaje ?? e?.message ?? 'Error al cargar el corte de caja')
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

  const handleGuardarGasto = async () => {
    if (!gastoForm.concepto.trim()) { setGastoError('El concepto es obligatorio'); return }
    if (!gastoForm.monto || Number(gastoForm.monto) <= 0) { setGastoError('Ingresa un monto válido'); return }
    setGuardando(true); setGastoError('')
    try {
      await registrarGasto({
        concepto:   gastoForm.concepto.trim(),
        monto:      Number(gastoForm.monto),
        categoria:  gastoForm.categoria,
        metodoPago: gastoForm.metodoPago,
        notas:      gastoForm.notas || undefined,
      })
      setModalGasto(false)
      setGastoForm(gastoFormVacio)
      cargar()
    } catch (e: any) {
      setGastoError(e?.response?.data?.mensaje ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarGasto = async (id: string) => {
    try { await eliminarGasto(id); setConfirmElim(null); cargar() }
    catch { alert('Error al eliminar') }
  }

  if (cargando) {
    return (
      <div className="p-6 text-center text-gray-400 py-16">
        <div className="text-4xl mb-3">🏦</div>
        Cargando corte...
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-16 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">No se pudo cargar el corte</h2>
          <p className="text-sm text-gray-500 mb-4">{errorMsg}</p>
          <button
            onClick={() => cargar()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!resumen) return null

  const r = resumen

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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Ingresos */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">
                Ingresos del día
              </div>
              <div className="text-3xl font-bold">${fmt(r.totalDia)}</div>
              <div className="text-xs text-gray-400 mt-1">
                {r.ordenesPagadas} orden{r.ordenesPagadas !== 1 ? 'es' : ''} · {r.pagos.length} pago{r.pagos.length !== 1 ? 's' : ''}
              </div>
            </div>
            {/* Gastos */}
            <div className={`rounded-xl p-5 border ${r.totalGastos > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                Gastos del día
              </div>
              <div className={`text-3xl font-bold ${r.totalGastos > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                ${fmt(r.totalGastos)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {r.gastos.length} gasto{r.gastos.length !== 1 ? 's' : ''} registrado{r.gastos.length !== 1 ? 's' : ''}
              </div>
            </div>
            {/* Utilidad neta */}
            <div className={`rounded-xl p-5 border col-span-2 lg:col-span-1 ${r.utilidadNeta >= 0
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'}`}>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                Utilidad neta
              </div>
              <div className={`text-3xl font-bold ${r.utilidadNeta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ${fmt(r.utilidadNeta)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Ingresos − Gastos
              </div>
            </div>
          </div>

          {/* ── Desglose por método ───────────────────────── */}
          <div className="grid grid-cols-3 gap-4">

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>💵</span>
                <span className="text-xs font-medium text-green-700 uppercase tracking-wide">Efectivo</span>
              </div>
              <div className="text-xl font-bold text-green-800">${fmt(r.porMetodo.EFECTIVO)}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>💳</span>
                <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Tarjeta</span>
              </div>
              <div className="text-xl font-bold text-blue-800">${fmt(r.porMetodo.TARJETA)}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>📲</span>
                <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Transfer.</span>
              </div>
              <div className="text-xl font-bold text-purple-800">${fmt(r.porMetodo.TRANSFERENCIA)}</div>
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

            {/* Tabs + botón nuevo gasto */}
            <div className="flex items-center justify-between border-b border-gray-200">
              <div className="flex no-print">
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
                <button
                  onClick={() => setTab('gastos')}
                  className={`px-5 py-3 text-sm font-medium transition-colors
                    ${tab === 'gastos'
                      ? 'text-red-600 border-b-2 border-red-500 bg-red-50/30'
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Gastos ({r.gastos.length})
                </button>
              </div>
              {/* Solo visible si la fecha es hoy */}
              {r.fecha === fechaHoy() && (
                <button
                  onClick={() => { setGastoForm(gastoFormVacio); setGastoError(''); setModalGasto(true) }}
                  className="mr-4 text-sm text-red-600 font-medium border border-red-200
                             px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors no-print"
                >
                  + Registrar gasto
                </button>
              )}
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
            ) : tab === 'ventas' ? (
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
            ) : (
              /* ── Pestaña gastos ──────────────────── */
              r.gastos.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">💸</div>
                  <p>Sin gastos registrados en esta fecha</p>
                  {r.fecha === fechaHoy() && (
                    <button
                      onClick={() => { setGastoForm(gastoFormVacio); setGastoError(''); setModalGasto(true) }}
                      className="mt-3 text-sm text-red-600 underline"
                    >
                      Registrar un gasto
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Hora</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Concepto</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Categoría</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Método</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Monto</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 no-print">Registró</th>
                        <th className="px-4 py-3 no-print" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {r.gastos.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-500 text-xs font-mono">{hora(g.hora)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{g.concepto}</div>
                            {g.notas && <div className="text-xs text-gray-400">{g.notas}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                              ${CATEGORIA_COLOR[g.categoria] ?? 'bg-gray-100 text-gray-700'}`}>
                              {CATEGORIA_LABEL[g.categoria] ?? g.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                              ${METODO_COLOR[g.metodoPago] ?? 'bg-gray-100 text-gray-700'}`}>
                              {METODO_LABEL[g.metodoPago] ?? g.metodoPago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-700">
                            ${fmt(g.monto)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 no-print">{g.registradoPor}</td>
                          <td className="px-4 py-3 no-print">
                            {r.fecha === fechaHoy() && (
                              <button
                                onClick={() => setConfirmElim(g.id)}
                                className="text-xs text-gray-400 hover:text-red-600 px-2 py-1
                                           rounded hover:bg-red-50 transition-colors"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-600">
                          Total gastos
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-700 text-base">
                          ${fmt(r.totalGastos)}
                        </td>
                        <td colSpan={2} className="no-print" />
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

      {/* ════════════════════════════════════════════════════
          Modal: Registrar gasto
      ════════════════════════════════════════════════════ */}
      {modalGasto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Registrar gasto</h2>
              <button
                onClick={() => setModalGasto(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">

              {/* Concepto */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={gastoForm.concepto}
                  onChange={e => setGastoForm(f => ({ ...f, concepto: e.target.value }))}
                  placeholder="Ej. Compra de aceite, pago de luz…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Monto <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={gastoForm.monto}
                    onChange={e => setGastoForm(f => ({ ...f, monto: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['REFACCIONES', 'NOMINA', 'SERVICIOS', 'OTROS'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGastoForm(f => ({ ...f, categoria: cat }))}
                      className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors
                        ${gastoForm.categoria === cat
                          ? `${CATEGORIA_COLOR[cat]} border-transparent ring-2 ring-offset-1
                             ${cat === 'REFACCIONES' ? 'ring-blue-400'
                               : cat === 'NOMINA' ? 'ring-purple-400'
                               : cat === 'SERVICIOS' ? 'ring-amber-400'
                               : 'ring-gray-400'}`
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                    >
                      {CATEGORIA_LABEL[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as const).map(met => (
                    <button
                      key={met}
                      type="button"
                      onClick={() => setGastoForm(f => ({ ...f, metodoPago: met }))}
                      className={`text-xs px-2 py-2 rounded-lg border font-medium transition-colors
                        ${gastoForm.metodoPago === met
                          ? `${METODO_COLOR[met]} border-transparent ring-2 ring-offset-1
                             ${met === 'EFECTIVO' ? 'ring-green-400'
                               : met === 'TARJETA' ? 'ring-blue-400'
                               : 'ring-purple-400'}`
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                    >
                      {METODO_LABEL[met]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas (opcional) */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notas <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={gastoForm.notas}
                  onChange={e => setGastoForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Detalles adicionales…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                             focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {gastoError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200
                               rounded-lg px-3 py-2">
                  {gastoError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setModalGasto(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg
                           text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarGasto}
                disabled={guardando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50
                           text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {guardando ? 'Guardando…' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          Modal: Confirmar eliminación de gasto
      ════════════════════════════════════════════════════ */}
      {confirmElim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">¿Eliminar gasto?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmElim(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg
                           text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminarGasto(confirmElim)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg
                           text-sm font-medium transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
