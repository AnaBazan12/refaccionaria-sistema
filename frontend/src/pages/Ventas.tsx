import { useEffect, useState } from 'react'
import { registrarVenta, getVentasDelDia } from '../services/venta.service'
import { buscarRefaccion }                  from '../services/inventario.service'

type TipoVenta = 'MOSTRADOR' | 'TALLER' | 'MAYOREO'

interface Venta {
  id:             string
  cantidad:       number
  tipoVenta:      TipoVenta
  precioUnitario: number
  precioSinIva:   number
  ganancia:       number
  subtotal:       number
  fecha:          string
  refaccion:      { nombre: string; codigo: string }
  usuario?:       { nombre: string }
}

interface ResumenDia {
  fecha:           string
  totalVentas:     string
  totalGanancia:   string
  totalCosto:      string
  porTipo:         Record<string, { cantidad: number; total: number; ganancia: number }>
  ventas:          Venta[]
}

const TIPOS: { valor: TipoVenta; label: string; color: string }[] = [
  { valor: 'MOSTRADOR', label: 'Mostrador', color: 'bg-blue-100 text-blue-700'   },
  { valor: 'TALLER',    label: 'Taller',    color: 'bg-purple-100 text-purple-700' },
  { valor: 'MAYOREO',   label: 'Mayoreo',   color: 'bg-amber-100 text-amber-700'  },
]

export default function Ventas() {
  const [resumen,       setResumen]       = useState<ResumenDia | null>(null)
  const [cargando,      setCargando]      = useState(true)
  const [fechaSel,      setFechaSel]      = useState(
    new Date().toISOString().split('T')[0]
  )

  // Form nueva venta
  const [modalAbierto, setModalAbierto]   = useState(false)
  const [busqueda,     setBusqueda]       = useState('')
  const [resultados,   setResultados]     = useState<any[]>([])
  const [buscando,     setBuscando]       = useState(false)
  const [refSelec,     setRefSelec]       = useState<any>(null)
  const [cantidad,     setCantidad]       = useState(1)
  const [tipoVenta,    setTipoVenta]      = useState<TipoVenta>('MOSTRADOR')
  const [guardando,    setGuardando]      = useState(false)
  const [error,        setError]          = useState('')
  const [exito,        setExito]          = useState('')

  const cargar = async () => {
    setCargando(true)
    try {
      setResumen(await getVentasDelDia(fechaSel))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [fechaSel])

  // Buscar refacción con delay
  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return }
    const timer = setTimeout(async () => {
      setBuscando(true)
      try {
        setResultados(await buscarRefaccion(busqueda))
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda])

  const seleccionarRefaccion = (r: any) => {
    setRefSelec(r)
    setBusqueda(r.nombre)
    setResultados([])
  }

  // Precio según tipo de venta seleccionado
  const precioActual = () => {
    if (!refSelec) return 0
    if (tipoVenta === 'MAYOREO' && refSelec.precioMayoreo)
      return Number(refSelec.precioMayoreo)
    if (tipoVenta === 'TALLER')
      return Number(refSelec.precioTaller)
    return Number(refSelec.precioMostrador)
  }

  const subtotalPreview = precioActual() * cantidad
  const gananciaPreview = ((precioActual() / 1.16) - Number(refSelec?.costoCompra ?? 0)) * cantidad

  const handleVender = async () => {
    if (!refSelec) { setError('Selecciona una refacción'); return }
    if (cantidad <= 0) { setError('La cantidad debe ser mayor a 0'); return }
    setGuardando(true)
    setError('')
    try {
      await registrarVenta({
        refaccionId: refSelec.id,
        cantidad,
        tipoVenta
      })
      setExito(`Venta registrada: ${refSelec.nombre} × ${cantidad}`)
      setRefSelec(null)
      setBusqueda('')
      setCantidad(1)
      setTipoVenta('MOSTRADOR')
      cargar()
      setTimeout(() => setExito(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al registrar la venta')
    } finally {
      setGuardando(false)
    }
  }

  const abrirModal = () => {
    setRefSelec(null)
    setBusqueda('')
    setResultados([])
    setCantidad(1)
    setTipoVenta('MOSTRADOR')
    setError('')
    setModalAbierto(true)
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Mensaje de éxito */}
      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-700
                        text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <span>✓</span> {exito}
        </div>
      )}

      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <>
          {/* Tarjetas resumen del día */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-5">
              <div className="text-sm text-green-600 font-medium mb-1">
                Total vendido
              </div>
              <div className="text-3xl font-bold text-green-700">
                ${Number(resumen?.totalVentas ?? 0).toLocaleString('es-MX')}
              </div>
              <div className="text-xs text-green-500 mt-1">con IVA incluido</div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <div className="text-sm text-blue-600 font-medium mb-1">
                Ganancia del día
              </div>
              <div className="text-3xl font-bold text-blue-700">
                ${Number(resumen?.totalGanancia ?? 0).toLocaleString('es-MX')}
              </div>
              <div className="text-xs text-blue-500 mt-1">utilidad real</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <div className="text-sm text-gray-600 font-medium mb-1">
                Costo total
              </div>
              <div className="text-3xl font-bold text-gray-700">
                ${Number(resumen?.totalCosto ?? 0).toLocaleString('es-MX')}
              </div>
              <div className="text-xs text-gray-400 mt-1">lo que costaron las piezas</div>
            </div>
          </div>

          {/* Ventas por tipo */}
          {resumen?.porTipo && Object.keys(resumen.porTipo).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TIPOS.map(t => {
                const datos = resumen.porTipo[t.valor]
                if (!datos) return null
                return (
                  <div
                    key={t.valor}
                    className="bg-white border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-medium px-2.5 py-1
                                        rounded-full ${t.color}`}>
                        {t.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {datos.cantidad} pza{datos.cantidad !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-gray-800">
                      ${Number(datos.total).toLocaleString('es-MX')}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Ganancia: ${Number(datos.ganancia).toLocaleString('es-MX')}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Lista de ventas del día */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">
                Ventas del {new Date(fechaSel + 'T12:00:00').toLocaleDateString(
                  'es-MX', { weekday: 'long', day: 'numeric', month: 'long' }
                )}
              </h2>
            </div>

            {!resumen?.ventas?.length ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🛒</div>
                <div>Sin ventas registradas este día</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Hora
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Refacción
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Tipo
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Cant.
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Precio c/IVA
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Subtotal
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Ganancia
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">
                      Vendió
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resumen.ventas.map(v => {
                    const tipo = TIPOS.find(t => t.valor === v.tipoVenta)
                    return (
                      <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {new Date(v.fecha).toLocaleTimeString('es-MX', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-800">
                            {v.refaccion.nombre}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            {v.refaccion.codigo}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2.5 py-0.5
                                            rounded-full ${tipo?.color}`}>
                            {tipo?.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-700 font-medium">
                          {v.cantidad}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          ${Number(v.precioUnitario).toLocaleString('es-MX')}
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-800">
                          ${Number(v.subtotal).toLocaleString('es-MX')}
                        </td>
                        <td className="px-5 py-3 text-green-600 font-medium">
                          ${Number(v.ganancia).toLocaleString('es-MX')}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {v.usuario?.nombre ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* Total al pie de la tabla */}
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={5} className="px-5 py-3 text-sm font-semibold
                                               text-gray-700 text-right">
                      Total del día:
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900">
                      ${Number(resumen.totalVentas).toLocaleString('es-MX')}
                    </td>
                    <td className="px-5 py-3 font-bold text-green-600">
                      ${Number(resumen.totalGanancia).toLocaleString('es-MX')}
                    </td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── Modal nueva venta ──────────────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">

            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Nueva venta</h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>

            <div className="p-6 space-y-5">

              {/* Buscar refacción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar refacción *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => {
                      setBusqueda(e.target.value)
                      if (refSelec) setRefSelec(null)
                    }}
                    placeholder="Nombre o código..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {buscando && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2
                                     text-gray-400 text-xs">
                      Buscando...
                    </span>
                  )}
                </div>

                {/* Resultados */}
                {resultados.length > 0 && (
                  <div className="border border-gray-200 rounded-xl mt-1
                                  overflow-hidden shadow-sm">
                    {resultados.map(r => (
                      <button
                        key={r.id}
                        onClick={() => seleccionarRefaccion(r)}
                        className="w-full flex items-center justify-between
                                   px-4 py-3 hover:bg-blue-50 text-left
                                   border-b border-gray-100 last:border-0
                                   transition-colors"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {r.nombre}
                          </div>
                          <div className="text-xs text-gray-400">
                            {r.codigo} {r.marca ? `· ${r.marca}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-800">
                            ${Number(r.precioMostrador).toLocaleString('es-MX')}
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

              {/* Refacción seleccionada */}
              {refSelec && (
                <div className="bg-blue-50 border border-blue-200
                                rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-blue-800">
                        {refSelec.nombre}
                      </div>
                      <div className="text-xs text-blue-500 mt-0.5">
                        Stock disponible: {refSelec.stockActual} pzas
                      </div>
                    </div>
                    <button
                      onClick={() => { setRefSelec(null); setBusqueda('') }}
                      className="text-blue-400 hover:text-blue-600 text-lg"
                    >×</button>
                  </div>
                </div>
              )}

              {/* Tipo de venta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de venta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map(t => (
                    <button
                      key={t.valor}
                      type="button"
                      onClick={() => setTipoVenta(t.valor)}
                      className={`py-2.5 rounded-lg text-sm font-medium
                                  transition-colors ${tipoVenta === t.valor
                        ? t.color + ' ring-2 ring-offset-1 ring-blue-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCantidad(c => Math.max(1, c - 1))}
                    className="w-10 h-10 rounded-lg border border-gray-300
                               text-gray-600 hover:bg-gray-50 text-lg font-bold"
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={e => setCantidad(Math.max(1, Number(e.target.value)))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2
                               text-sm text-center font-bold focus:outline-none
                               focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCantidad(c => c + 1)}
                    className="w-10 h-10 rounded-lg border border-gray-300
                               text-gray-600 hover:bg-gray-50 text-lg font-bold"
                  >+</button>
                </div>
              </div>

              {/* Preview del total */}
              {refSelec && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Precio unitario (c/IVA)</span>
                    <span>${precioActual().toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Cantidad</span>
                    <span>× {cantidad}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800
                                  pt-2 border-t border-gray-200 text-base">
                    <span>Total</span>
                    <span>${subtotalPreview.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Tu ganancia</span>
                    <span>+${gananciaPreview.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700
                                text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300
                             rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVender}
                  disabled={guardando || !refSelec}
                  className="flex-2 px-8 py-2 bg-blue-600 text-white text-sm
                             font-medium rounded-lg hover:bg-blue-700
                             disabled:bg-blue-400 transition-colors"
                >
                  {guardando ? 'Registrando...' : 'Registrar venta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}