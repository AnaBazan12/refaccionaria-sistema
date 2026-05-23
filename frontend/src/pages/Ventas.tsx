import { useEffect, useState } from 'react'
import { registrarTicket, getVentasDelDia } from '../services/venta.service'
import { buscarRefaccion }                  from '../services/inventario.service'
import { getClientes }                      from '../services/cliente.service'

type TipoVenta = 'MOSTRADOR' | 'TALLER' | 'MAYOREO'

interface ClienteOpc {
  id:       string
  nombre:   string
  telefono?: string
}

interface Venta {
  id:             string
  cantidad:       number
  tipoVenta:      TipoVenta
  precioUnitario: number
  precioSinIva:   number
  ganancia:       number
  subtotal:       number
  fecha:          string
  ticketId:       string | null
  clienteId:      string | null
  descuentoPct:   number
  refaccion:      { nombre: string; codigo: string }
  usuario?:       { nombre: string }
  cliente?:       { nombre: string } | null
}

interface ResumenDia {
  fecha:           string
  totalVentas:     string
  totalGanancia:   string
  totalCosto:      string
  porTipo:         Record<string, { cantidad: number; total: number; ganancia: number }>
  ventas:          Venta[]
}

// Item dentro del carrito
interface CarritoItem {
  refaccion: any
  cantidad:  number
}

const TIPOS: { valor: TipoVenta; label: string; color: string }[] = [
  { valor: 'MOSTRADOR', label: '🏪 Mostrador', color: 'bg-blue-100 text-blue-700'     },
  { valor: 'TALLER',    label: '🔧 Taller',    color: 'bg-purple-100 text-purple-700' },
  { valor: 'MAYOREO',   label: '📦 Mayoreo',   color: 'bg-amber-100 text-amber-700'   },
]

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Ventas() {
  const [resumen,  setResumen]  = useState<ResumenDia | null>(null)
  const [cargando, setCargando] = useState(true)
  const [fechaSel, setFechaSel] = useState(new Date().toISOString().split('T')[0])

  // Modal carrito
  const [modal,       setModal]       = useState(false)
  const [tipoVenta,   setTipoVenta]   = useState<TipoVenta>('MOSTRADOR')
  const [carrito,     setCarrito]     = useState<CarritoItem[]>([])
  const [busqueda,    setBusqueda]    = useState('')
  const [resultados,  setResultados]  = useState<any[]>([])
  const [buscando,    setBuscando]    = useState(false)
  const [guardando,   setGuardando]   = useState(false)
  const [error,       setError]       = useState('')

  // Cliente opcional para el ticket
  const [clienteSel,      setClienteSel]      = useState<ClienteOpc | null>(null)
  const [busqCliente,     setBusqCliente]     = useState('')
  const [resClientes,     setResClientes]     = useState<ClienteOpc[]>([])
  const [buscandoCliente, setBuscandoCliente] = useState(false)

  // Descuento del ticket (0–100 %)
  const [descuentoPct, setDescuentoPct] = useState('')

  // Vista de tickets expandidos
  const [ticketAbierto, setTicketAbierto] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    try { setResumen(await getVentasDelDia(fechaSel)) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [fechaSel])

  // Búsqueda de refacciones con debounce
  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try { setResultados(await buscarRefaccion(busqueda)) }
      finally { setBuscando(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  // Búsqueda de clientes con debounce
  useEffect(() => {
    if (!busqCliente.trim()) { setResClientes([]); return }
    const t = setTimeout(async () => {
      setBuscandoCliente(true)
      try {
        const resp = await getClientes({ q: busqCliente, limit: 8 })
        setResClientes(Array.isArray(resp) ? resp : (resp.data ?? []))
      } finally { setBuscandoCliente(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [busqCliente])

  // ── Carrito helpers ───────────────────────────────────────────
  const agregarAlCarrito = (ref: any) => {
    setBusqueda('')
    setResultados([])
    setCarrito(prev => {
      const existe = prev.find(i => i.refaccion.id === ref.id)
      if (existe) {
        return prev.map(i =>
          i.refaccion.id === ref.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      }
      return [...prev, { refaccion: ref, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (refId: string, delta: number) => {
    setCarrito(prev =>
      prev
        .map(i => i.refaccion.id === refId ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter(i => i.cantidad > 0)
    )
  }

  const quitarDelCarrito = (refId: string) =>
    setCarrito(prev => prev.filter(i => i.refaccion.id !== refId))

  const precioItem = (ref: any) => {
    if (tipoVenta === 'MAYOREO' && ref.precioMayoreo) return Number(ref.precioMayoreo)
    if (tipoVenta === 'TALLER') return Number(ref.precioTaller)
    return Number(ref.precioMostrador)
  }

  const pctNum         = Math.min(Math.max(Number(descuentoPct) || 0, 0), 100)
  const descFactor     = 1 - pctNum / 100
  const subtotalBruto  = carrito.reduce((s, i) => s + precioItem(i.refaccion) * i.cantidad, 0)
  const montoDescuento = subtotalBruto * (pctNum / 100)
  const totalCarrito   = subtotalBruto * descFactor
  const gananciaCarrito = carrito.reduce((s, i) => {
    const p = precioItem(i.refaccion)
    return s + (((p / 1.16) * descFactor) - Number(i.refaccion.costoCompra)) * i.cantidad
  }, 0)

  const abrirModal = () => {
    setCarrito([])
    setBusqueda('')
    setResultados([])
    setTipoVenta('MOSTRADOR')
    setClienteSel(null)
    setBusqCliente('')
    setResClientes([])
    setDescuentoPct('')
    setError('')
    setModal(true)
  }

  const handleRegistrar = async () => {
    if (!carrito.length) { setError('Agrega al menos una refacción'); return }
    setGuardando(true); setError('')
    try {
      await registrarTicket({
        tipoVenta,
        items:        carrito.map(i => ({ refaccionId: i.refaccion.id, cantidad: i.cantidad })),
        clienteId:    clienteSel?.id ?? undefined,
        descuentoPct: pctNum > 0 ? pctNum : undefined,
      })
      setModal(false)
      cargar()
    } catch (e: any) {
      setError(e.response?.data?.mensaje || 'Error al registrar')
    } finally {
      setGuardando(false)
    }
  }

  // ── Agrupar ventas del día por ticket ─────────────────────────
  const ventasAgrupadas = (() => {
    if (!resumen?.ventas?.length) return []
    const tickets: Record<string, Venta[]> = {}
    const sueltas: Venta[] = []
    for (const v of resumen.ventas) {
      if (v.ticketId) {
        if (!tickets[v.ticketId]) tickets[v.ticketId] = []
        tickets[v.ticketId].push(v)
      } else {
        sueltas.push(v)
      }
    }
    // tickets como array ordenado por fecha del primer item
    const ticketList = Object.entries(tickets).map(([id, items]) => ({
      ticketId:    id,
      fecha:       items[0].fecha,
      items,
      total:       items.reduce((s, v) => s + Number(v.subtotal), 0),
      ganancia:    items.reduce((s, v) => s + Number(v.ganancia), 0),
      tipoVenta:   items[0].tipoVenta,
      vendedor:    items[0].usuario?.nombre ?? '—',
      cliente:     items[0].cliente?.nombre ?? null,
      descuentoPct: Number(items[0].descuentoPct ?? 0),
    }))
    return [...ticketList.map(t => ({ tipo: 'ticket' as const, data: t })),
            ...sueltas.map(v => ({ tipo: 'suelta' as const, data: v }))]
      .sort((a, b) => new Date(
        a.tipo === 'ticket' ? a.data.fecha : (a.data as Venta).fecha
      ).getTime() - new Date(
        b.tipo === 'ticket' ? b.data.fecha : (b.data as Venta).fecha
      ).getTime())
      .reverse()
  })()

  const tipoColor = (t: TipoVenta) =>
    TIPOS.find(x => x.valor === t)?.color ?? 'bg-gray-100 text-gray-600'
  const tipoLabel = (t: TipoVenta) =>
    TIPOS.find(x => x.valor === t)?.label ?? t

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de ventas del día</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={fechaSel}
            onChange={e => setFechaSel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={abrirModal}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm
                       font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            + Nueva venta
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <>
          {/* ── Tarjetas resumen ──────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-5">
              <div className="text-sm text-green-600 font-medium mb-1">Total vendido</div>
              <div className="text-3xl font-bold text-green-700">
                ${fmt(Number(resumen?.totalVentas ?? 0))}
              </div>
              <div className="text-xs text-green-500 mt-1">con IVA incluido</div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <div className="text-sm text-blue-600 font-medium mb-1">Ganancia del día</div>
              <div className="text-3xl font-bold text-blue-700">
                ${fmt(Number(resumen?.totalGanancia ?? 0))}
              </div>
              <div className="text-xs text-blue-500 mt-1">utilidad real</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <div className="text-sm text-gray-600 font-medium mb-1">Costo total</div>
              <div className="text-3xl font-bold text-gray-700">
                ${fmt(Number(resumen?.totalCosto ?? 0))}
              </div>
              <div className="text-xs text-gray-400 mt-1">lo que costaron las piezas</div>
            </div>
          </div>

          {/* ── Desglose por tipo ─────────────────────────── */}
          {resumen?.porTipo && Object.keys(resumen.porTipo).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TIPOS.map(t => {
                const d = resumen.porTipo[t.valor]
                if (!d) return null
                return (
                  <div key={t.valor} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.color}`}>
                        {t.label}
                      </span>
                      <span className="text-xs text-gray-400">{d.cantidad} pza{d.cantidad !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-xl font-bold text-gray-800">${fmt(Number(d.total))}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Ganancia: ${fmt(Number(d.ganancia))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Lista de ventas ───────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">
                Ventas del {new Date(fechaSel + 'T12:00:00').toLocaleDateString(
                  'es-MX', { weekday: 'long', day: 'numeric', month: 'long' }
                )}
              </h2>
            </div>

            {!ventasAgrupadas.length ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🛒</div>
                <div>Sin ventas registradas este día</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {ventasAgrupadas.map((row, idx) => {

                  if (row.tipo === 'ticket') {
                    const t = row.data
                    const abierto = ticketAbierto === t.ticketId
                    return (
                      <div key={t.ticketId}>
                        {/* Fila resumen del ticket */}
                        <button
                          onClick={() => setTicketAbierto(abierto ? null : t.ticketId)}
                          className="w-full flex items-center gap-4 px-5 py-3.5
                                     hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="text-gray-400 text-xs font-mono w-12 shrink-0">
                            {new Date(t.fecha).toLocaleTimeString('es-MX',
                              { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-blue-600 text-lg">{abierto ? '▼' : '▶'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-800">
                                Ticket · {t.items.length} artículo{t.items.length !== 1 ? 's' : ''}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${tipoColor(t.tipoVenta)}`}>
                                {tipoLabel(t.tipoVenta)}
                              </span>
                              {t.cliente && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                                  👤 {t.cliente}
                                </span>
                              )}
                              {t.descuentoPct > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                  🏷️ -{t.descuentoPct}%
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 truncate">
                              {t.items.map(i => i.refaccion.nombre).join(' · ')}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-gray-800">${fmt(t.total)}</div>
                            <div className="text-xs text-green-600">+${fmt(t.ganancia)}</div>
                          </div>
                          <div className="text-xs text-gray-400 w-20 shrink-0 text-right hidden sm:block">
                            {t.vendedor}
                          </div>
                        </button>

                        {/* Items expandidos */}
                        {abierto && (
                          <div className="bg-blue-50/40 border-t border-blue-100">
                            {t.items.map(v => (
                              <div key={v.id}
                                className="flex items-center gap-3 px-8 py-2.5 text-sm
                                           border-b border-blue-100/50 last:border-0">
                                <span className="text-blue-300 text-xs">└</span>
                                <div className="flex-1">
                                  <span className="font-medium text-gray-700">{v.refaccion.nombre}</span>
                                  <span className="text-gray-400 text-xs font-mono ml-2">{v.refaccion.codigo}</span>
                                </div>
                                <span className="text-gray-500">×{v.cantidad}</span>
                                <span className="text-gray-600 w-20 text-right">
                                  ${fmt(Number(v.precioUnitario))}
                                </span>
                                <span className="font-semibold text-gray-800 w-24 text-right">
                                  ${fmt(Number(v.subtotal))}
                                </span>
                                <span className="text-green-600 text-xs w-20 text-right">
                                  +${fmt(Number(v.ganancia))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Venta suelta (sin ticket)
                  const v = row.data as Venta
                  const tipo = TIPOS.find(t => t.valor === v.tipoVenta)
                  return (
                    <div key={v.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                      <span className="text-gray-400 text-xs font-mono w-12 shrink-0">
                        {new Date(v.fecha).toLocaleTimeString('es-MX',
                          { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-gray-300 text-lg">—</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{v.refaccion.nombre}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${tipo?.color}`}>
                            {tipo?.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{v.refaccion.codigo}</div>
                      </div>
                      <span className="text-gray-600 text-sm">×{v.cantidad}</span>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-gray-800">${fmt(Number(v.subtotal))}</div>
                        <div className="text-xs text-green-600">+${fmt(Number(v.ganancia))}</div>
                      </div>
                      <div className="text-xs text-gray-400 w-20 shrink-0 text-right hidden sm:block">
                        {v.usuario?.nombre ?? '—'}
                      </div>
                    </div>
                  )
                })}

                {/* Totales al pie */}
                <div className="flex items-center justify-end gap-8 px-5 py-4
                                bg-gray-50 border-t-2 border-gray-200 text-sm font-semibold">
                  <span className="text-gray-600">Total del día:</span>
                  <span className="text-gray-900 text-base">
                    ${fmt(Number(resumen?.totalVentas ?? 0))}
                  </span>
                  <span className="text-green-600">
                    +${fmt(Number(resumen?.totalGanancia ?? 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          Modal: Carrito de venta
      ══════════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh]
                          flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Nueva venta</h2>
              <button
                onClick={() => setModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Tipo de venta */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Tipo de venta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map(t => (
                    <button
                      key={t.valor}
                      type="button"
                      onClick={() => setTipoVenta(t.valor)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors
                        ${tipoVenta === t.valor
                          ? t.color + ' ring-2 ring-offset-1 ring-blue-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente opcional */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cliente <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                {clienteSel ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200
                                  rounded-lg px-3 py-2">
                    <span className="text-blue-700 font-medium text-sm flex-1">
                      👤 {clienteSel.nombre}
                      {clienteSel.telefono && (
                        <span className="text-blue-400 font-normal ml-1 text-xs">
                          · {clienteSel.telefono}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => { setClienteSel(null); setBusqCliente('') }}
                      className="text-blue-400 hover:text-red-500 text-lg leading-none"
                    >×</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={busqCliente}
                      onChange={e => setBusqCliente(e.target.value)}
                      placeholder="Buscar cliente por nombre o teléfono..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                                 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {buscandoCliente && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2
                                       text-gray-400 text-xs">Buscando…</span>
                    )}
                    {resClientes.length > 0 && (
                      <div className="absolute z-10 w-full border border-gray-200 rounded-xl
                                      mt-1 bg-white shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        {resClientes.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setClienteSel(c)
                              setBusqCliente('')
                              setResClientes([])
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5
                                       hover:bg-blue-50 text-left border-b border-gray-100
                                       last:border-0 transition-colors"
                          >
                            <span className="text-gray-400">👤</span>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{c.nombre}</div>
                              {c.telefono && (
                                <div className="text-xs text-gray-400">{c.telefono}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Buscador */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Buscar y agregar refacciones
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Nombre o código..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                               pr-20"
                    autoFocus
                  />
                  {buscando && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2
                                     text-gray-400 text-xs">Buscando…</span>
                  )}
                </div>

                {resultados.length > 0 && (
                  <div className="border border-gray-200 rounded-xl mt-1
                                  overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                    {resultados.map(r => (
                      <button
                        key={r.id}
                        onClick={() => agregarAlCarrito(r)}
                        className="w-full flex items-center justify-between
                                   px-4 py-2.5 hover:bg-blue-50 text-left
                                   border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-800">{r.nombre}</div>
                          <div className="text-xs text-gray-400">
                            {r.codigo}{r.marca ? ` · ${r.marca}` : ''}
                          </div>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <div className="text-sm font-bold text-gray-800">
                            ${fmt(Number(r.precioMostrador))}
                          </div>
                          <div className={`text-xs ${r.stockActual <= r.stockMinimo
                            ? 'text-red-500' : 'text-gray-400'}`}>
                            Stock: {r.stockActual}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Carrito */}
              {carrito.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">
                      Artículos en esta venta
                    </label>
                    <span className="text-xs text-gray-400">
                      {carrito.length} artículo{carrito.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {carrito.map((item, i) => {
                      const precio   = precioItem(item.refaccion)
                      const subtotal = precio * item.cantidad
                      return (
                        <div key={item.refaccion.id}
                          className={`flex items-center gap-3 px-4 py-3
                            ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {item.refaccion.nombre}
                            </div>
                            <div className="text-xs text-gray-400">
                              ${fmt(precio)} c/u
                            </div>
                          </div>
                          {/* Controles de cantidad */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => cambiarCantidad(item.refaccion.id, -1)}
                              className="w-7 h-7 rounded border border-gray-300
                                         text-gray-600 hover:bg-gray-50 text-sm font-bold
                                         flex items-center justify-center"
                            >−</button>
                            <span className="w-8 text-center text-sm font-bold text-gray-800">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => cambiarCantidad(item.refaccion.id, +1)}
                              disabled={item.cantidad >= item.refaccion.stockActual}
                              className="w-7 h-7 rounded border border-gray-300
                                         text-gray-600 hover:bg-gray-50 text-sm font-bold
                                         flex items-center justify-center
                                         disabled:opacity-40"
                            >+</button>
                          </div>
                          <span className="text-sm font-bold text-gray-800 w-20 text-right">
                            ${fmt(subtotal)}
                          </span>
                          <button
                            onClick={() => quitarDelCarrito(item.refaccion.id)}
                            className="text-gray-300 hover:text-red-500 text-lg
                                       transition-colors leading-none"
                          >×</button>
                        </div>
                      )
                    })}

                    {/* Descuento */}
                    <div className="border-t border-gray-100 px-4 py-3 bg-amber-50/60">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-amber-700 shrink-0">
                          🏷️ Descuento
                        </label>
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={descuentoPct}
                            onChange={e => setDescuentoPct(e.target.value)}
                            placeholder="0"
                            className="w-20 border border-amber-300 rounded-lg px-2 py-1.5
                                       text-sm text-center focus:outline-none
                                       focus:ring-2 focus:ring-amber-400 bg-white"
                          />
                          <span className="text-sm text-amber-700 font-medium">%</span>
                          {pctNum > 0 && (
                            <span className="text-xs text-amber-600 ml-1">
                              — ahorro: ${fmt(montoDescuento)}
                            </span>
                          )}
                        </div>
                        {pctNum > 0 && (
                          <button
                            onClick={() => setDescuentoPct('')}
                            className="text-amber-400 hover:text-red-500 text-base leading-none"
                          >×</button>
                        )}
                      </div>
                    </div>

                    {/* Total del carrito */}
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3
                                    flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">
                          {pctNum > 0 ? (
                            <>
                              <span className="line-through text-gray-400">${fmt(subtotalBruto)}</span>
                              <span className="ml-1 text-amber-600 font-medium">-{pctNum}%</span>
                            </>
                          ) : 'Total'}
                        </div>
                        <div className="text-xs text-green-600">
                          Ganancia estimada: +${fmt(gananciaCarrito)}
                        </div>
                      </div>
                      <span className={`text-xl font-bold ${pctNum > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                        ${fmt(totalCarrito)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm
                                border border-dashed border-gray-200 rounded-xl">
                  🛒 Busca y agrega las refacciones vendidas
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700
                                text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setModal(false)}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-300
                           rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrar}
                disabled={guardando || carrito.length === 0}
                className="flex-2 px-8 py-2.5 bg-blue-600 text-white text-sm
                           font-medium rounded-lg hover:bg-blue-700
                           disabled:opacity-50 transition-colors"
              >
                {guardando
                  ? 'Registrando…'
                  : pctNum > 0
                    ? `Registrar · $${fmt(totalCarrito)} (-${pctNum}%)`
                    : `Registrar venta · $${fmt(totalCarrito)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
