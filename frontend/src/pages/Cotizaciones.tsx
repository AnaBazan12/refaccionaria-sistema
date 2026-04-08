import { useEffect, useState } from 'react'
import {
  getCotizaciones, crearCotizacion,
  convertirEnOrden, rechazarCotizacion
} from '../services/cotizacion.service'
import { getClientes }          from '../services/cliente.service'
import { getVehiculosPorCliente } from '../services/orden.service'
import { getMecanicos }         from '../services/mecanico.service'
import { buscarRefaccion }      from '../services/inventario.service'
import api                      from '../services/api'
import { abrirPDF } from '../utils/pdf'



type EstadoCot = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CONVERTIDA'

const colorEstadoCot: Record<EstadoCot, string> = {
  PENDIENTE:  'bg-amber-100  text-amber-700',
  APROBADA:   'bg-green-100  text-green-700',
  RECHAZADA:  'bg-red-100    text-red-700',
  CONVERTIDA: 'bg-purple-100 text-purple-700',
}

const labelEstadoCot: Record<EstadoCot, string> = {
  PENDIENTE:  'Pendiente',
  APROBADA:   'Aprobada',
  RECHAZADA:  'Rechazada',
  CONVERTIDA: 'Convertida en OT',
}

interface Item {
  descripcion:    string
  cantidad:       number
  precioUnitario: number
  subtotal:       number
  refaccionId?:   string
  servicioId?:    string
  tipo:           'refaccion' | 'servicio' | 'otro'
}

export default function Cotizaciones() {
  const [cotizaciones,  setCotizaciones]  = useState<any[]>([])
  const [clientes,      setClientes]      = useState<any[]>([])
  const [mecanicos,     setMecanicos]     = useState<any[]>([])
  const [servicios,     setServicios]     = useState<any[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [modalCrear,    setModalCrear]    = useState(false)
  const [modalDetalle,  setModalDetalle]  = useState<any>(null)
  const [modalConvertir,setModalConvertir]= useState<any>(null)
  const [filtroEstado,  setFiltroEstado]  = useState<EstadoCot | ''>('')

  // Form crear
  const [clienteId,    setClienteId]    = useState('')
  const [vehiculoId,   setVehiculoId]   = useState('')
  const [vehiculos,    setVehiculos]    = useState<any[]>([])
  const [notas,        setNotas]        = useState('')
  const [validaHasta,  setValidaHasta]  = useState('')
  const [items,        setItems]        = useState<Item[]>([])

  // Form item
  const [tipoItem,     setTipoItem]     = useState<'refaccion'|'servicio'|'otro'>('otro')
  const [descItem,     setDescItem]     = useState('')
  const [cantItem,     setCantItem]     = useState(1)
  const [precioItem,   setPrecioItem]   = useState('')
  const [busqRef,      setBusqRef]      = useState('')
  const [resultRef,    setResultRef]    = useState<any[]>([])
  const [refSelec,     setRefSelec]     = useState<any>(null)
  const [servicioSel,  setServicioSel]  = useState('')

  // Form convertir
  const [mecanicoConv, setMecanicoConv] = useState('')
  const [kmConv,       setKmConv]       = useState('')
  const [diagConv,     setDiagConv]     = useState('')

  const [guardando,    setGuardando]    = useState(false)
  const [error,        setError]        = useState('')

  const cargar = async () => {
    setCargando(true)
    try {
      const [cots, cls, mecs] = await Promise.all([
        getCotizaciones(),
        getClientes(),
        getMecanicos()
      ])
      setCotizaciones(cots)
      setClientes(cls)
      setMecanicos(mecs)
    } finally {
      setCargando(false)
    }
  }

  const cargarServicios = async () => {
    const { data } = await api.get('/servicios')
    setServicios(data)
  }

  useEffect(() => { cargar(); cargarServicios() }, [])

  useEffect(() => {
    if (!clienteId) { setVehiculos([]); return }
    getVehiculosPorCliente(clienteId).then(setVehiculos)
  }, [clienteId])

  // Búsqueda de refacciones para items
  useEffect(() => {
    if (!busqRef.trim()) { setResultRef([]); return }
    const t = setTimeout(async () => {
      const r = await buscarRefaccion(busqRef)
      setResultRef(r)
    }, 300)
    return () => clearTimeout(t)
  }, [busqRef])

  // ── Agregar item a la cotización ──────────────────────────
  const agregarItem = () => {
    if (!descItem || !precioItem || cantItem <= 0) return

    const precio   = Number(precioItem)
    const subtotal = precio * cantItem

    const nuevoItem: Item = {
      descripcion:    descItem,
      cantidad:       cantItem,
      precioUnitario: precio,
      subtotal,
      tipo:           tipoItem,
      refaccionId:    tipoItem === 'refaccion' ? refSelec?.id  : undefined,
      servicioId:     tipoItem === 'servicio'  ? servicioSel   : undefined
    }

    setItems(prev => [...prev, nuevoItem])
    setDescItem('')
    setCantItem(1)
    setPrecioItem('')
    setRefSelec(null)
    setBusqRef('')
    setServicioSel('')
  }

  const quitarItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))

  const totalCotizacion = items.reduce((s, i) => s + i.subtotal, 0)

  // ── Guardar cotización ────────────────────────────────────
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId) { setError('Selecciona un cliente'); return }
    if (items.length === 0) {
      setError('Agrega al menos un item')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await crearCotizacion({
        clienteId,
        vehiculoId:  vehiculoId  || undefined,
        notas:       notas       || undefined,
        validaHasta: validaHasta || undefined,
        items: items.map(i => ({
          descripcion:    i.descripcion,
          cantidad:       i.cantidad,
          precioUnitario: i.precioUnitario,
          refaccionId:    i.refaccionId,
          servicioId:     i.servicioId
        }))
      })
      setModalCrear(false)
      resetForm()
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al crear')
    } finally {
      setGuardando(false)
    }
  }

  // ── Convertir en orden ────────────────────────────────────
  const handleConvertir = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const resultado = await convertirEnOrden(modalConvertir.id, {
        mecanicoId:  mecanicoConv || undefined,
        kilometraje: kmConv ? Number(kmConv) : undefined,
        diagnostico: diagConv || undefined
      })
      alert(`✅ Orden #${resultado.numero} creada exitosamente`)
      setModalConvertir(null)
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al convertir')
    } finally {
      setGuardando(false)
    }
  }

  const handleRechazar = async (id: string) => {
    if (!confirm('¿Marcar esta cotización como rechazada?')) return
    await rechazarCotizacion(id)
    cargar()
  }

  const resetForm = () => {
    setClienteId(''); setVehiculoId(''); setNotas('')
    setValidaHasta(''); setItems([]); setError('')
  }

  const fmt = (n: any) =>
    `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  const cotizacionesFiltradas = filtroEstado
    ? cotizaciones.filter(c => c.estado === filtroEstado)
    : cotizaciones

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cotizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            {cotizaciones.length} cotización{cotizaciones.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setModalCrear(true) }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm
                     font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          + Nueva cotización
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroEstado('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium
            ${!filtroEstado
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todas
        </button>
        {(Object.keys(colorEstadoCot) as EstadoCot[]).map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium
              ${filtroEstado === e
                ? 'bg-gray-800 text-white'
                : colorEstadoCot[e]}`}
          >
            {labelEstadoCot[e]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : cotizacionesFiltradas.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <div className="text-gray-500">No hay cotizaciones</div>
        </div>
      ) : (
        <div className="space-y-3">
          {cotizacionesFiltradas.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200
                         p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">

                  {/* Header cotización */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono font-bold text-gray-400">
                      #COT-{c.numero}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs
                                     font-medium ${colorEstadoCot[c.estado as EstadoCot]}`}>
                      {labelEstadoCot[c.estado as EstadoCot]}
                    </span>
                    {c.validaHasta && c.estado === 'PENDIENTE' && (
                      <span className={`text-xs ${
                        new Date(c.validaHasta) < new Date()
                          ? 'text-red-500'
                          : 'text-gray-400'
                      }`}>
                        {new Date(c.validaHasta) < new Date()
                          ? '⚠ Vencida'
                          : `Válida hasta ${new Date(c.validaHasta)
                              .toLocaleDateString('es-MX')}`
                        }
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Cliente</div>
                      <div className="font-medium text-gray-800 truncate">
                        {c.cliente?.nombre}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Vehículo</div>
                      <div className="font-medium text-gray-800">
                        {c.vehiculo
                          ? `${c.vehiculo.marca} ${c.vehiculo.modelo}`
                          : '—'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Items</div>
                      <div className="font-medium text-gray-800">
                        {c.items?.length ?? 0} concepto{c.items?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-0.5">Total</div>
                      <div className="font-bold text-gray-800 text-base">
                        {fmt(c.total)}
                      </div>
                    </div>
                  </div>

                  {c.notas && (
                    <div className="text-xs text-gray-400 mt-2 line-clamp-1">
                      {c.notas}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setModalDetalle(c)}
                    className="text-xs border border-gray-300 text-gray-600
                               hover:bg-gray-50 px-3 py-1.5 rounded-lg
                               transition-colors"
                  >
                    Ver detalle
                  </button>
                  {c.estado === 'PENDIENTE' && (
                    <>
                      <button
                        onClick={() => {
                          setError('')
                          setMecanicoConv('')
                          setKmConv('')
                          setDiagConv('')
                          setModalConvertir(c)
                        }}
                        className="text-xs bg-purple-600 hover:bg-purple-700
                                   text-white px-3 py-1.5 rounded-lg
                                   transition-colors"
                      >
                        → Crear OT
                      </button>
                      <button
                        onClick={() => handleRechazar(c.id)}
                        className="text-xs text-red-500 hover:text-red-700
                                   px-3 py-1.5 rounded-lg hover:bg-red-50
                                   transition-colors"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {c.estado === 'CONVERTIDA' && c.orden && (
                    <span className="text-xs text-purple-600 font-medium px-3">
                      OT #{c.orden.numero}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal crear cotización ───────────────────────── */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl
                          max-h-[92vh] flex flex-col">

            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                Nueva cotización
              </h2>
              <button
                onClick={() => setModalCrear(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl
                           leading-none"
              >×</button>
            </div>

            <form
              onSubmit={handleGuardar}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {/* Cliente y vehículo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium
                                    text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    value={clienteId}
                    onChange={e => {
                      setClienteId(e.target.value)
                      setVehiculoId('')
                    }}
                    className="w-full border border-gray-300 rounded-lg
                               px-3 py-2 text-sm focus:outline-none
                               focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium
                                    text-gray-700 mb-1">
                    Vehículo
                  </label>
                  <select
                    value={vehiculoId}
                    onChange={e => setVehiculoId(e.target.value)}
                    disabled={!clienteId}
                    className="w-full border border-gray-300 rounded-lg
                               px-3 py-2 text-sm focus:outline-none
                               focus:ring-2 focus:ring-blue-500
                               disabled:bg-gray-100"
                  >
                    <option value="">Sin vehículo</option>
                    {vehiculos.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.marca} {v.modelo} — {v.placa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Válida hasta y notas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium
                                    text-gray-700 mb-1">
                    Válida hasta
                  </label>
                  <input
                    type="date"
                    value={validaHasta}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setValidaHasta(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg
                               px-3 py-2 text-sm focus:outline-none
                               focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium
                                    text-gray-700 mb-1">
                    Notas
                  </label>
                  <input
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Observaciones del presupuesto..."
                    className="w-full border border-gray-300 rounded-lg
                               px-3 py-2 text-sm focus:outline-none
                               focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Agregar items */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="text-sm font-semibold text-gray-700">
                  Conceptos del presupuesto
                </div>

                {/* Tipo de item */}
                <div className="grid grid-cols-3 gap-2">
                  {(['refaccion', 'servicio', 'otro'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTipoItem(t)
                        setDescItem('')
                        setPrecioItem('')
                        setRefSelec(null)
                        setServicioSel('')
                      }}
                      className={`py-2 rounded-lg text-xs font-medium
                                  capitalize transition-colors
                        ${tipoItem === t
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {t === 'refaccion' ? '🔩 Refacción'
                       : t === 'servicio' ? '🔧 Servicio'
                       : '📝 Otro'}
                    </button>
                  ))}
                </div>

                {/* Campos según tipo */}
                {tipoItem === 'refaccion' && (
                  <div className="relative">
                    <input
                      value={busqRef}
                      onChange={e => {
                        setBusqRef(e.target.value)
                        if (refSelec) setRefSelec(null)
                      }}
                      placeholder="Buscar refacción..."
                      className="w-full border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none
                                 focus:ring-2 focus:ring-blue-500"
                    />
                    {resultRef.length > 0 && (
                      <div className="absolute top-full left-0 right-0
                                      border border-gray-200 rounded-xl
                                      bg-white shadow-lg z-10 mt-1">
                        {resultRef.slice(0, 5).map((r: any) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setRefSelec(r)
                              setBusqRef(r.nombre)
                              setDescItem(r.nombre)
                              setPrecioItem(r.precioTaller.toString())
                              setResultRef([])
                            }}
                            className="w-full flex justify-between px-4 py-3
                                       hover:bg-blue-50 text-left text-sm
                                       border-b border-gray-100 last:border-0"
                          >
                            <span>{r.nombre}</span>
                            <span className="font-bold">
                              {fmt(r.precioTaller)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tipoItem === 'servicio' && (
                  <select
                    value={servicioSel}
                    onChange={e => {
                      setServicioSel(e.target.value)
                      const s = servicios.find(sv => sv.id === e.target.value)
                      if (s) {
                        setDescItem(s.nombre)
                        setPrecioItem(s.precioBase.toString())
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg
                               px-3 py-2 text-sm focus:outline-none
                               focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar servicio</option>
                    {servicios.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                )}

                {/* Descripción, cantidad y precio */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      Descripción
                    </label>
                    <input
                      value={descItem}
                      onChange={e => setDescItem(e.target.value)}
                      placeholder="Concepto..."
                      className="w-full border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none
                                 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cantItem}
                      onChange={e => setCantItem(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none
                                 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">
                        Precio
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={precioItem}
                        onChange={e => setPrecioItem(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-lg
                                   px-3 py-2 text-sm focus:outline-none
                                   focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={agregarItem}
                      className="mb-0 px-3 py-2 bg-blue-600 text-white
                                 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Lista de items */}
                {items.length > 0 && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between
                                   bg-gray-50 rounded-lg px-3 py-2.5 text-sm"
                      >
                        <div className="flex-1">
                          <span className="text-gray-700">
                            {item.descripcion}
                          </span>
                          <span className="text-gray-400 ml-2 text-xs">
                            × {item.cantidad}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-800">
                            {fmt(item.subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => quitarItem(idx)}
                            className="text-red-400 hover:text-red-600"
                          >×</button>
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex justify-between items-center
                                    font-bold text-gray-800 pt-2
                                    border-t border-gray-200 px-3">
                      <span>Total presupuesto</span>
                      <span className="text-lg text-blue-700">
                        {fmt(totalCotizacion)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700
                                text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCrear(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2 bg-blue-600 text-white text-sm
                             font-medium rounded-lg hover:bg-blue-700
                             disabled:bg-blue-400"
                >
                  {guardando ? 'Guardando...' : 'Crear cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal detalle cotización ─────────────────────── */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg
                          max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-400">
                    #COT-{modalDetalle.numero}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs
                                   font-medium
                    ${colorEstadoCot[modalDetalle.estado as EstadoCot]}`}>
                    {labelEstadoCot[modalDetalle.estado as EstadoCot]}
                  </span>
                </div>
                <div className="font-bold text-gray-800 mt-1">
                  {modalDetalle.cliente?.nombre}
                </div>
              </div>
              <button
                onClick={() => setModalDetalle(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl
                           leading-none"
              >×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Vehículo */}
              {modalDetalle.vehiculo && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm">
                  <span className="text-blue-600 font-medium">
                    {modalDetalle.vehiculo.marca}{' '}
                    {modalDetalle.vehiculo.modelo}
                  </span>
                  <span className="text-blue-400 ml-2">
                    — {modalDetalle.vehiculo.placa}
                  </span>
                </div>
              )}

              {/* Notas */}
              {modalDetalle.notas && (
                <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm
                                text-amber-800">
                  {modalDetalle.notas}
                </div>
              )}

              {/* Items */}
              <div className="space-y-2">
                <div className="text-xs text-gray-500 font-medium">
                  Conceptos
                </div>
                {modalDetalle.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center
                               bg-gray-50 rounded-lg px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium text-gray-800">
                        {item.descripcion}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.cantidad} × {fmt(item.precioUnitario)}
                      </div>
                    </div>
                    <div className="font-bold text-gray-800">
                      {fmt(item.subtotal)}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-between font-bold text-gray-900
                                text-base pt-3 border-t border-gray-200 px-4">
                  <span>Total</span>
                  <span className="text-blue-700">{fmt(modalDetalle.total)}</span>
                </div>
              </div>

              {/* Info extra */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400">Creada por</div>
                  <div className="font-medium text-gray-700">
                    {modalDetalle.creadoPor?.nombre ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Fecha</div>
                  <div className="font-medium text-gray-700">
                    {new Date(modalDetalle.createdAt)
                      .toLocaleDateString('es-MX')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setModalDetalle(null)}
                className="w-full py-2.5 border border-gray-300 text-gray-600
                           rounded-lg hover:bg-gray-50 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal convertir en OT ────────────────────────── */}
      {modalConvertir && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Convertir en orden de trabajo
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Cotización #{modalConvertir.numero} —{' '}
                  {fmt(modalConvertir.total)}
                </p>
              </div>
              <button
                onClick={() => setModalConvertir(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl
                           leading-none"
              >×</button>
            </div>

            <form onSubmit={handleConvertir} className="p-6 space-y-4">

              <div className="bg-purple-50 border border-purple-200
                              rounded-xl px-4 py-3 text-sm text-purple-800">
                Se creará una orden de trabajo con todos los conceptos
                de esta cotización. Las refacciones descontarán el stock
                automáticamente.
              </div>

              <div>
                <label className="block text-sm font-medium
                                  text-gray-700 mb-1">
                  Mecánico asignado
                </label>
                <select
                  value={mecanicoConv}
                  onChange={e => setMecanicoConv(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg
                             px-3 py-2 text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {mecanicos.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium
                                  text-gray-700 mb-1">
                  Kilometraje actual
                </label>
                <input
                  type="number"
                  value={kmConv}
                  onChange={e => setKmConv(e.target.value)}
                  placeholder="52000"
                  className="w-full border border-gray-300 rounded-lg
                             px-3 py-2 text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium
                                  text-gray-700 mb-1">
                  Diagnóstico / Notas adicionales
                </label>
                <textarea
                  value={diagConv}
                  onChange={e => setDiagConv(e.target.value)}
                  rows={2}
                  placeholder="Cliente aprobó el presupuesto..."
                  className="w-full border border-gray-300 rounded-lg
                             px-3 py-2 text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700
                                text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConvertir(null)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300
                             rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white
                             text-sm font-medium rounded-lg
                             hover:bg-purple-700 disabled:bg-purple-400"
                >
                  {guardando ? 'Creando...' : '✓ Crear orden'}
                </button>
                <button
           onClick={() => abrirPDF(
             `/pdf/cotizacion/${modalDetalle.id}`,
           `cotizacion-${modalDetalle.numero}.pdf`
                        )}
                className="flex-1 flex items-center justify-center gap-2
             bg-gray-800 hover:bg-gray-700 text-white text-sm
             font-medium py-2.5 rounded-lg transition-colors"
>
  📄 Imprimir PDF
</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}