import { useEffect, useState } from 'react'
import { registrarCompra, getCompras } from '../services/compra.service'
import { buscarRefaccion }             from '../services/inventario.service'
import { getProveedores }              from '../services/proveedor.service'

// ── Tipos ─────────────────────────────────────────────────────
interface ItemCarrito {
  refaccion:     any
  cantidad:      number
  costoUnitario: number
}

interface CompraRegistrada {
  id:            string
  fecha:         string
  facturaNumero: string | null
  notas:         string | null
  total:         string | number
  proveedor:     { nombre: string } | null
  items: {
    id:            string
    cantidad:      number
    costoUnitario: number
    subtotal:      number
    actualizoCosto: boolean
    refaccion:     { nombre: string; codigo: string }
  }[]
}

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n: any) =>
  Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Compras() {
  const [compras,      setCompras]      = useState<CompraRegistrada[]>([])
  const [proveedores,  setProveedores]  = useState<any[]>([])
  const [cargando,     setCargando]     = useState(true)
  const [compraAbierta,setCompraAbierta]= useState<string | null>(null)

  // Filtros de lista
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroDe,        setFiltroDe]        = useState('')
  const [filtroHasta,     setFiltroHasta]      = useState('')

  // Modal nueva compra
  const [modal,      setModal]      = useState(false)
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState('')

  // Form
  const [formProveedor,  setFormProveedor]  = useState('')
  const [formFactura,    setFormFactura]    = useState('')
  const [formNotas,      setFormNotas]      = useState('')
  const [actualizarCostos, setActualizarCostos] = useState(true)
  const [carrito,        setCarrito]        = useState<ItemCarrito[]>([])

  // Buscador de refacciones
  const [busqueda,    setBusqueda]    = useState('')
  const [resultados,  setResultados]  = useState<any[]>([])
  const [buscando,    setBuscando]    = useState(false)

  // ── Carga inicial ─────────────────────────────────────────
  const cargar = async () => {
    setCargando(true)
    try {
      const params: any = {}
      if (filtroProveedor) params.proveedorId = filtroProveedor
      if (filtroDe)        params.desde       = filtroDe
      if (filtroHasta)     params.hasta       = filtroHasta
      const resp = await getCompras(params)
      setCompras(resp.compras ?? [])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    getProveedores().then(setProveedores).catch(() => {})
    cargar()
  }, [])

  useEffect(() => { cargar() }, [filtroProveedor, filtroDe, filtroHasta])

  // Búsqueda con debounce
  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try { setResultados(await buscarRefaccion(busqueda)) }
      finally { setBuscando(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  // ── Carrito helpers ───────────────────────────────────────
  const agregarAlCarrito = (ref: any) => {
    setBusqueda('')
    setResultados([])
    setCarrito(prev => {
      const existe = prev.find(i => i.refaccion.id === ref.id)
      if (existe) return prev.map(i =>
        i.refaccion.id === ref.id ? { ...i, cantidad: i.cantidad + 1 } : i
      )
      // Usar costoCompra actual como sugerencia de precio
      return [...prev, { refaccion: ref, cantidad: 1, costoUnitario: Number(ref.costoCompra) }]
    })
  }

  const cambiarCantidad = (refId: string, delta: number) =>
    setCarrito(prev =>
      prev
        .map(i => i.refaccion.id === refId ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter(i => i.cantidad > 0)
    )

  const cambiarCosto = (refId: string, valor: string) =>
    setCarrito(prev =>
      prev.map(i =>
        i.refaccion.id === refId
          ? { ...i, costoUnitario: parseFloat(valor) || 0 }
          : i
      )
    )

  const quitarDelCarrito = (refId: string) =>
    setCarrito(prev => prev.filter(i => i.refaccion.id !== refId))

  const totalCarrito = carrito.reduce((s, i) => s + i.costoUnitario * i.cantidad, 0)

  const abrirModal = () => {
    setCarrito([])
    setBusqueda('')
    setResultados([])
    setFormProveedor('')
    setFormFactura('')
    setFormNotas('')
    setActualizarCostos(true)
    setError('')
    setModal(true)
  }

  const handleRegistrar = async () => {
    if (!carrito.length) { setError('Agrega al menos una refacción'); return }
    const costoInvalido = carrito.find(i => !i.costoUnitario || i.costoUnitario <= 0)
    if (costoInvalido) {
      setError(`Costo inválido en: ${costoInvalido.refaccion.nombre}`)
      return
    }
    setGuardando(true); setError('')
    try {
      await registrarCompra({
        proveedorId:     formProveedor   || undefined,
        facturaNumero:   formFactura     || undefined,
        notas:           formNotas       || undefined,
        actualizarCostos,
        items: carrito.map(i => ({
          refaccionId:   i.refaccion.id,
          cantidad:      i.cantidad,
          costoUnitario: i.costoUnitario
        }))
      })
      setModal(false)
      cargar()
    } catch (e: any) {
      setError(e.response?.data?.mensaje || 'Error al registrar')
    } finally {
      setGuardando(false)
    }
  }

  // ── Totales generales ─────────────────────────────────────
  const totalGeneral = compras.reduce((s, c) => s + Number(c.total), 0)

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
          <p className="text-sm text-gray-500 mt-1">Entradas de inventario de proveedores</p>
        </div>
        <button
          onClick={abrirModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm
                     font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          + Registrar entrada
        </button>
      </div>

      {/* ── Filtros ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4
                      flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Proveedor</label>
          <select
            value={filtroProveedor}
            onChange={e => setFiltroProveedor(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[160px]"
          >
            <option value="">Todos</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={filtroDe}
            onChange={e => setFiltroDe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={filtroHasta}
            onChange={e => setFiltroHasta(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {(filtroProveedor || filtroDe || filtroHasta) && (
          <button
            onClick={() => { setFiltroProveedor(''); setFiltroDe(''); setFiltroHasta('') }}
            className="text-sm text-gray-400 hover:text-gray-600 px-2 py-2"
          >✕ Limpiar</button>
        )}
        {!cargando && compras.length > 0 && (
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-400">Total en compras</div>
            <div className="font-bold text-gray-800">${fmt(totalGeneral)}</div>
          </div>
        )}
      </div>

      {/* ── Lista de compras ──────────────────────────────── */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {!compras.length ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">📦</div>
              <div>No hay entradas registradas</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {compras.map(c => {
                const abierta = compraAbierta === c.id
                return (
                  <div key={c.id}>
                    {/* Fila resumen */}
                    <button
                      onClick={() => setCompraAbierta(abierta ? null : c.id)}
                      className="w-full flex items-center gap-4 px-5 py-4
                                 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Fecha */}
                      <div className="shrink-0 text-right w-20">
                        <div className="text-xs text-gray-500 font-medium">
                          {new Date(c.fecha).toLocaleDateString('es-MX',
                            { day: '2-digit', month: 'short' })}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(c.fecha).toLocaleTimeString('es-MX',
                            { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <span className="text-emerald-500 text-lg">{abierta ? '▼' : '▶'}</span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">
                            {c.proveedor?.nombre ?? 'Sin proveedor'}
                          </span>
                          {c.facturaNumero && (
                            <span className="text-xs bg-gray-100 text-gray-500
                                             px-2 py-0.5 rounded-full font-mono">
                              #{c.facturaNumero}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {c.items.length} artículo{c.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">
                          {c.items.map(i => i.refaccion.nombre).join(' · ')}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="text-right shrink-0">
                        <div className="font-bold text-gray-800">${fmt(c.total)}</div>
                        <div className="text-xs text-gray-400">costo total</div>
                      </div>
                    </button>

                    {/* Detalle expandido */}
                    {abierta && (
                      <div className="bg-emerald-50/40 border-t border-emerald-100">
                        {/* Tabla de items */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 border-b border-emerald-100">
                                <th className="text-left px-8 py-2 font-medium">Refacción</th>
                                <th className="text-center px-3 py-2 font-medium">Cant.</th>
                                <th className="text-right px-3 py-2 font-medium">Costo u.</th>
                                <th className="text-right px-3 py-2 font-medium">Subtotal</th>
                                <th className="text-center px-3 py-2 font-medium">Costo actualizado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.items.map(item => (
                                <tr key={item.id}
                                  className="border-b border-emerald-100/50 last:border-0
                                             hover:bg-emerald-50/60">
                                  <td className="px-8 py-2.5">
                                    <span className="text-emerald-400 text-xs mr-2">└</span>
                                    <span className="font-medium text-gray-700">
                                      {item.refaccion.nombre}
                                    </span>
                                    <span className="text-gray-400 text-xs font-mono ml-2">
                                      {item.refaccion.codigo}
                                    </span>
                                  </td>
                                  <td className="text-center px-3 py-2.5 text-gray-600">
                                    ×{item.cantidad}
                                  </td>
                                  <td className="text-right px-3 py-2.5 text-gray-600">
                                    ${fmt(item.costoUnitario)}
                                  </td>
                                  <td className="text-right px-3 py-2.5 font-semibold text-gray-800">
                                    ${fmt(item.subtotal)}
                                  </td>
                                  <td className="text-center px-3 py-2.5">
                                    {item.actualizoCosto
                                      ? <span className="text-emerald-600 text-xs font-medium">✓ Sí</span>
                                      : <span className="text-gray-400 text-xs">No</span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {c.notas && (
                          <div className="px-8 py-2.5 text-xs text-gray-500 italic border-t border-emerald-100/50">
                            📝 {c.notas}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Modal: Registrar entrada de inventario
      ══════════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh]
                          flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Registrar entrada de inventario</h2>
              <button
                onClick={() => setModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Datos de la compra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Proveedor <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    value={formProveedor}
                    onChange={e => setFormProveedor(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                               text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    # Factura <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={formFactura}
                    onChange={e => setFormFactura(e.target.value)}
                    placeholder="ej. F-2024-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                               text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notas <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formNotas}
                  onChange={e => setFormNotas(e.target.value)}
                  placeholder="Ej. Pedido mensual de Mayasa"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                             text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Toggle actualizar costos */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={actualizarCostos}
                    onChange={e => setActualizarCostos(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors
                    ${actualizarCostos ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full
                    shadow transition-transform
                    ${actualizarCostos ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Actualizar costo de compra en el inventario
                  </div>
                  <div className="text-xs text-gray-400">
                    Los precios de venta se recalcularán automáticamente
                  </div>
                </div>
              </label>

              <hr className="border-gray-100" />

              {/* Buscador de refacciones */}
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
                               text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {buscando && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2
                                     text-gray-400 text-xs">Buscando…</span>
                  )}
                </div>

                {resultados.length > 0 && (
                  <div className="border border-gray-200 rounded-xl mt-1 overflow-hidden
                                  shadow-sm max-h-48 overflow-y-auto">
                    {resultados.map(r => (
                      <button
                        key={r.id}
                        onClick={() => agregarAlCarrito(r)}
                        className="w-full flex items-center justify-between
                                   px-4 py-2.5 hover:bg-emerald-50 text-left
                                   border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-800">{r.nombre}</div>
                          <div className="text-xs text-gray-400">
                            {r.codigo}{r.marca ? ` · ${r.marca}` : ''}
                          </div>
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <div className="text-xs text-gray-500">
                            Costo actual: ${fmt(r.costoCompra)}
                          </div>
                          <div className="text-xs text-gray-400">
                            Stock: {r.stockActual}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Carrito / Items */}
              {carrito.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">
                      Artículos a ingresar
                    </label>
                    <span className="text-xs text-gray-400">
                      {carrito.length} artículo{carrito.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Encabezado de columnas */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2
                                    bg-gray-50 px-3 py-2 text-xs text-gray-500 font-medium
                                    border-b border-gray-200">
                      <span>Refacción</span>
                      <span className="text-center w-20">Cant.</span>
                      <span className="text-right w-28">Costo unit.</span>
                      <span className="text-right w-24">Subtotal</span>
                      <span className="w-6" />
                    </div>

                    {carrito.map((item, i) => {
                      const subtotal = item.costoUnitario * item.cantidad
                      return (
                        <div key={item.refaccion.id}
                          className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-2
                            items-center px-3 py-2.5
                            ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {item.refaccion.nombre}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {item.refaccion.codigo}
                            </div>
                          </div>

                          {/* Cantidad */}
                          <div className="flex items-center gap-1 w-20 justify-center">
                            <button
                              onClick={() => cambiarCantidad(item.refaccion.id, -1)}
                              className="w-6 h-6 rounded border border-gray-300
                                         text-gray-600 hover:bg-gray-50 text-xs font-bold
                                         flex items-center justify-center"
                            >−</button>
                            <span className="w-7 text-center text-sm font-bold text-gray-800">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => cambiarCantidad(item.refaccion.id, +1)}
                              className="w-6 h-6 rounded border border-gray-300
                                         text-gray-600 hover:bg-gray-50 text-xs font-bold
                                         flex items-center justify-center"
                            >+</button>
                          </div>

                          {/* Costo unitario editable */}
                          <div className="w-28">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2
                                               text-gray-400 text-sm">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.costoUnitario || ''}
                                onChange={e => cambiarCosto(item.refaccion.id, e.target.value)}
                                className="w-full border border-gray-300 rounded pl-5 pr-2
                                           py-1 text-sm text-right focus:outline-none
                                           focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          {/* Subtotal */}
                          <span className="text-sm font-semibold text-gray-800 w-24 text-right">
                            ${fmt(subtotal)}
                          </span>

                          {/* Quitar */}
                          <button
                            onClick={() => quitarDelCarrito(item.refaccion.id)}
                            className="text-gray-300 hover:text-red-500 text-lg
                                       transition-colors leading-none w-6 text-center"
                          >×</button>
                        </div>
                      )
                    })}

                    {/* Total */}
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3
                                    flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Total de la compra
                      </div>
                      <span className="text-xl font-bold text-gray-900">
                        ${fmt(totalCarrito)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm
                                border border-dashed border-gray-200 rounded-xl">
                  📦 Busca y agrega las refacciones que llegaron
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
                className="flex-2 px-8 py-2.5 bg-emerald-600 text-white text-sm
                           font-medium rounded-lg hover:bg-emerald-700
                           disabled:opacity-50 transition-colors"
              >
                {guardando
                  ? 'Registrando…'
                  : `Registrar entrada · $${fmt(totalCarrito)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
