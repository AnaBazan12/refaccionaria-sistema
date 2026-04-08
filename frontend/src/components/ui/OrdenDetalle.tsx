import { useEffect, useState } from 'react'
import api from '../../services/api'
import { labelEstado, colorEstado } from '../../utils/estados'
import { buscarRefaccion } from '../../services/inventario.service'
import { abrirPDF } from '../../utils/pdf'

interface Props {
  orden: any
  onCerrar: () => void
  onActualizar: () => void
}

const TIPOS_PAGO = [
  { valor: 'CONTADO', label: 'Contado', color: 'bg-green-100 text-green-700' },
  { valor: 'ANTICIPO', label: 'Anticipo', color: 'bg-blue-100 text-blue-700' },
  { valor: 'ABONO', label: 'Abono', color: 'bg-purple-100 text-purple-700' },
  { valor: 'CREDITO', label: 'Crédito', color: 'bg-red-100 text-red-700' },
]

type Tab = 'resumen' | 'refacciones' | 'pagos' | 'bitacora'

export default function OrdenDetalleModal({
  orden, onCerrar, onActualizar
}: Props) {
  const [tab, setTab] = useState<Tab>('resumen')
  const [detalle, setDetalle] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [resumenPago, setResumenPago] = useState<any>(null)
  const [bitacora, setBitacora] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)

  // Form agregar refacción
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
  const [refSelec, setRefSelec] = useState<any>(null)
  const [cantRef, setCantRef] = useState(1)
  const [precioRef, setPrecioRef] = useState('')
  const [guardandoRef, setGuardandoRef] = useState(false)
  const [errorRef, setErrorRef] = useState('')

  // Form pago
  const [montoPago, setMontoPago] = useState('')
  const [tipoPago, setTipoPago] = useState('CONTADO')
  const [notasPago, setNotasPago] = useState('')
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [errorPago, setErrorPago] = useState('')

  useEffect(() => { cargarTab(tab) }, [tab])

  // Debounce para búsqueda de refacciones
  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return }
    const t = setTimeout(async () => {
      const r = await buscarRefaccion(busqueda)
      setResultados(r)
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const cargarTab = async (t: Tab) => {
    setCargando(true)
    try {
      if (t === 'refacciones') {
        const { data } = await api.get(`/ordenes/${orden.id}/detalle`)
        setDetalle(data)
      } else if (t === 'pagos') {
        const { data } = await api.get(`/ordenes/${orden.id}/pagos`)
        setPagos(data.pagos)
        setResumenPago(data.resumen)
      } else if (t === 'bitacora') {
        const { data } = await api.get(`/ordenes/${orden.id}/bitacora`)
        setBitacora(data)
      }
    } catch (error) {
        console.error("Error al cargar tab:", error)
    } finally {
      setCargando(false)
    }
  }

  const handleAgregarRefaccion = async () => {
    if (!refSelec) { setErrorRef('Selecciona una refacción'); return }
    setGuardandoRef(true)
    setErrorRef('')
    try {
      await api.post(`/ordenes/${orden.id}/detalle`, {
        refaccionId: refSelec.id,
        cantidad: cantRef,
        precioUnitario: Number(precioRef) || Number(refSelec.precioTaller)
      })
      setRefSelec(null)
      setBusqueda('')
      setCantRef(1)
      setPrecioRef('')
      cargarTab('refacciones')
      onActualizar()
    } catch (err: any) {
      setErrorRef(err.response?.data?.mensaje || 'Error al agregar')
    } finally {
      setGuardandoRef(false)
    }
  }

  const handleQuitarRefaccion = async (detalleId: string) => {
    if (!confirm('¿Quitar esta refacción? El stock se devolverá.')) return
    try {
      await api.delete(`/ordenes/${orden.id}/detalle/${detalleId}`)
      cargarTab('refacciones')
      onActualizar()
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al quitar')
    }
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!montoPago || Number(montoPago) <= 0) {
      setErrorPago('El monto debe ser mayor a 0')
      return
    }
    setGuardandoPago(true)
    setErrorPago('')
    try {
      await api.post(`/ordenes/${orden.id}/pagos`, {
        monto: Number(montoPago),
        tipo: tipoPago,
        notas: notasPago || undefined
      })
      setMontoPago('')
      setNotasPago('')
      cargarTab('pagos')
      onActualizar()
    } catch (err: any) {
      setErrorPago(err.response?.data?.mensaje || 'Error al registrar pago')
    } finally {
      setGuardandoPago(false)
    }
  }

  const fmt = (n: any) =>
    `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  const tabs: { id: Tab; label: string; icono: string }[] = [
    { id: 'resumen', label: 'Resumen', icono: '📋' },
    { id: 'refacciones', label: 'Refacciones', icono: '🔩' },
    { id: 'pagos', label: 'Pagos', icono: '💰' },
    { id: 'bitacora', label: 'Historial', icono: '📝' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm font-bold text-gray-400">#{orden.numero}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorEstado[orden.estado]}`}>
                {labelEstado[orden.estado]}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                ${orden.estadoPago === 'PAGADO' ? 'bg-green-100 text-green-700'
                  : orden.estadoPago === 'PARCIAL' ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'}`}>
                {orden.estadoPago === 'PAGADO' ? '✓ Pagado' : orden.estadoPago === 'PARCIAL' ? '½ Parcial' : '⚠ Pendiente'}
              </span>
            </div>
            <div className="text-lg font-bold text-gray-800">{orden.cliente?.nombre}</div>
            <div className="text-sm text-gray-500">
              {orden.vehiculo?.marca} {orden.vehiculo?.modelo} — {orden.vehiculo?.placa}
            </div>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px
                ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <span>{t.icono}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-400">Cargando información...</p>
            </div>
          ) : (
            <>
              {/* TAB RESUMEN */}
              {tab === 'resumen' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <div className="text-xs text-gray-500 mb-1">Mano de obra</div>
                            <div className="font-bold text-gray-800">{fmt(orden.totalManoObra)}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <div className="text-xs text-gray-500 mb-1">Refacciones</div>
                            <div className="font-bold text-gray-800">{fmt(orden.totalRefacciones)}</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <div className="text-xs text-blue-500 mb-1">Total</div>
                            <div className="font-bold text-blue-700 text-lg">{fmt(orden.total)}</div>
                        </div>
                        <div className={`rounded-xl p-4 text-center ${Number(orden.saldoPendiente) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                            <div className={`text-xs mb-1 ${Number(orden.saldoPendiente) > 0 ? 'text-red-500' : 'text-green-500'}`}>Pendiente</div>
                            <div className={`font-bold text-lg ${Number(orden.saldoPendiente) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {fmt(orden.saldoPendiente)}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <button onClick={() => abrirPDF(`/pdf/orden/${orden.id}`, `orden-${orden.numero}.pdf`)}
                                className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                            📄 PDF Orden
                        </button>
                        <button onClick={async () => {
                            const { data } = await api.get(`/pdf/whatsapp/${orden.id}?tipo=listo`)
                            window.open(data.url, '_blank')
                        }} className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                            📱 WhatsApp Listo
                        </button>
                        {Number(orden.saldoPendiente) > 0 && (
                            <button onClick={async () => {
                                const { data } = await api.get(`/pdf/whatsapp/${orden.id}?tipo=deuda`)
                                window.open(data.url, '_blank')
                            }} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                                💬 Cobrar Deuda
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                        <div>
                            <span className="text-gray-400 block">Mecánico</span>
                            <span className="font-medium">{orden.mecanico?.nombre ?? 'Sin asignar'}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Ingreso</span>
                            <span className="font-medium">{new Date(orden.fechaIngreso).toLocaleDateString('es-MX')}</span>
                        </div>
                    </div>
                </div>
              )}

              {/* TAB REFACCIONES */}
              {tab === 'refacciones' && (
                <div className="space-y-5">
                   {/* Formulario de búsqueda y agregado */}
                   {!['ENTREGADO', 'CANCELADO'].includes(orden.estado) && (
                      <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
                        <label className="text-sm font-semibold text-gray-700">Buscar Refacción</label>
                        <div className="relative">
                            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                   placeholder="Nombre o código..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                            {resultados.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-20 mt-1 max-h-48 overflow-y-auto">
                                    {resultados.map((r: any) => (
                                        <button key={r.id} onClick={() => { setRefSelec(r); setBusqueda(r.nombre); setPrecioRef(r.precioTaller.toString()); setResultados([]) }}
                                                className="w-full flex justify-between p-3 hover:bg-blue-50 text-left border-b text-sm">
                                            <span>{r.nombre}</span>
                                            <span className="font-bold">{fmt(r.precioTaller)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {refSelec && (
                            <div className="grid grid-cols-3 gap-3 pt-2">
                                <input type="number" min="1" value={cantRef} onChange={e => setCantRef(Number(e.target.value))} className="border rounded-lg p-2 text-sm" placeholder="Cant"/>
                                <input type="number" value={precioRef} onChange={e => setPrecioRef(e.target.value)} className="border rounded-lg p-2 text-sm" placeholder="Precio"/>
                                <button onClick={handleAgregarRefaccion} disabled={guardandoRef} className="bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                                    {guardandoRef ? '...' : 'Agregar'}
                                </button>
                            </div>
                        )}
                        {errorRef && <p className="text-red-500 text-xs">{errorRef}</p>}
                      </div>
                   )}
                   
                   {/* Lista de Refacciones */}
                   <div className="space-y-2">
                      {detalle.map((d: any) => (
                          <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                              <div>
                                  <p className="text-sm font-medium">{d.refaccion?.nombre}</p>
                                  <p className="text-xs text-gray-400">{d.cantidad} un. x {fmt(d.precioUnitario)}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                  <span className="font-bold text-sm">{fmt(d.subtotal)}</span>
                                  {!['ENTREGADO', 'CANCELADO'].includes(orden.estado) && (
                                      <button onClick={() => handleQuitarRefaccion(d.id)} className="text-red-400 hover:text-red-600">✕</button>
                                  )}
                              </div>
                          </div>
                      ))}
                   </div>
                </div>
              )}

              {/* TAB PAGOS */}
              {tab === 'pagos' && (
                <div className="space-y-5">
                    {resumenPago && (
                        <div className="grid grid-cols-3 gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div className="text-center"><p className="text-xs text-blue-600">Total</p><p className="font-bold">{fmt(resumenPago.total)}</p></div>
                            <div className="text-center border-x border-blue-200"><p className="text-xs text-green-600">Pagado</p><p className="font-bold text-green-700">{fmt(resumenPago.totalPagado)}</p></div>
                            <div className="text-center"><p className="text-xs text-red-600">Saldo</p><p className="font-bold text-red-700">{fmt(resumenPago.saldoPendiente)}</p></div>
                        </div>
                    )}

                    {!orden.pagado && (
                        <form onSubmit={handleRegistrarPago} className="border rounded-xl p-4 bg-gray-50 space-y-3">
                            <div className="grid grid-cols-4 gap-2">
                                {TIPOS_PAGO.map(t => (
                                    <button key={t.valor} type="button" onClick={() => setTipoPago(t.valor)}
                                            className={`py-1.5 rounded-lg text-xs font-medium transition-all ${tipoPago === t.valor ? t.color + ' ring-2 ring-blue-400' : 'bg-white border text-gray-500'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="number" step="0.01" value={montoPago} onChange={e => setMontoPago(e.target.value)} placeholder="Monto $" className="flex-1 border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500"/>
                                <button type="submit" disabled={guardandoPago} className="bg-green-600 text-white px-4 rounded-lg text-sm font-bold hover:bg-green-700 disabled:bg-gray-400">
                                    {guardandoPago ? '...' : 'Cobrar'}
                                </button>
                            </div>
                            {errorPago && <p className="text-red-500 text-xs">{errorPago}</p>}
                        </form>
                    )}

                    <div className="space-y-2">
                        {pagos.map((p: any) => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-white border rounded-xl shadow-sm">
                                <div>
                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full uppercase font-bold text-gray-500">{p.tipo}</span>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(p.fecha).toLocaleString()}</p>
                                </div>
                                <span className="font-bold text-green-600">{fmt(p.monto)}</span>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {/* TAB BITÁCORA */}
              {tab === 'bitacora' && (
                <div className="space-y-4">
                    {bitacora.map((b: any, _idx) => (
                        <div key={b.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <div className="w-0.5 h-full bg-gray-200"></div>
                            </div>
                            <div className="pb-4">
                                <p className="text-xs text-gray-400">{new Date(b.fecha).toLocaleString()}</p>
                                <p className="text-sm">
                                    De <span className="font-bold">{labelEstado[b.estadoAntes]}</span> a <span className="font-bold text-blue-600">{labelEstado[b.estadoDespues]}</span>
                                </p>
                                {b.notas && <p className="text-xs italic text-gray-500">"{b.notas}"</p>}
                            </div>
                        </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}