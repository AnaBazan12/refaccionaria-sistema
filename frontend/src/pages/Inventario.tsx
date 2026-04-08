import { useEffect, useState } from 'react'
import {
  getRefacciones, buscarRefaccion, crearRefaccion,
  actualizarRefaccion, entradaInventario,
  eliminarRefaccion, getProveedores
} from '../services/inventario.service'

interface Refaccion {
  id:              string
  codigo:          string
  nombre:          string
  descripcion?:    string
  marca?:          string
  costoCompra:     number
  margenGanancia:  number
  precioMostrador: number
  precioTaller:    number
  precioMayoreo?:  number
  stockActual:     number
  stockMinimo:     number
  stockBajo:       boolean
  proveedor?:      { nombre: string }
}

const formVacio = {
  codigo: '', nombre: '', descripcion: '', marca: '',
  costoCompra: '', margenGanancia: '30',
  precioMostrador: '', precioTaller: '', precioMayoreo: '',
  stockActual: '0', stockMinimo: '1', proveedorId: ''
}

export default function Inventario() {
  const [refacciones,   setRefacciones]   = useState<Refaccion[]>([])
  const [proveedores,   setProveedores]   = useState<any[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [busqueda,      setBusqueda]      = useState('')
  const [soloStockBajo, setSoloStockBajo] = useState(false)
  const [modalAbierto,  setModalAbierto]  = useState(false)
  const [modalEntrada,  setModalEntrada]  = useState<Refaccion | null>(null)
  const [editando,      setEditando]      = useState<Refaccion | null>(null)
  const [form,          setForm]          = useState(formVacio)
  const [cantEntrada,   setCantEntrada]   = useState('')
  const [motivoEntrada, setMotivoEntrada] = useState('')
  const [guardando,     setGuardando]     = useState(false)
  const [error,         setError]         = useState('')
  const [confirmElim,   setConfirmElim]   = useState<string | null>(null)
  const [vista,         setVista]         = useState<'tabla' | 'tarjetas'>('tabla')

  const cargar = async () => {
    setCargando(true)
    try {
      const [r, p] = await Promise.all([
        getRefacciones({ stockBajo: soloStockBajo || undefined }),
        getProveedores()
      ])
      setRefacciones(r)
      setProveedores(p)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [soloStockBajo])

  // Búsqueda con delay
  useEffect(() => {
    if (!busqueda.trim()) { cargar(); return }
    const timer = setTimeout(async () => {
      setCargando(true)
      try {
        setRefacciones(await buscarRefaccion(busqueda))
      } finally {
        setCargando(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [busqueda])

  // Calcular precios automáticamente cuando cambia costo o margen
  const calcularPrecios = (costo: string, margen: string) => {
    const c = parseFloat(costo)
    const m = parseFloat(margen)
    if (!c || !m) return
    const sinIva  = c / (1 - m / 100)
    const conIva  = sinIva * 1.16
    setForm(f => ({
      ...f,
      precioMostrador: conIva.toFixed(2),
      precioTaller:    conIva.toFixed(2)
    }))
  }

  const abrirCrear = () => {
    setEditando(null)
    setForm(formVacio)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (r: Refaccion) => {
    setEditando(r)
    setForm({
      codigo:          r.codigo,
      nombre:          r.nombre,
      descripcion:     r.descripcion   ?? '',
      marca:           r.marca         ?? '',
      costoCompra:     r.costoCompra.toString(),
      margenGanancia:  r.margenGanancia.toString(),
      precioMostrador: r.precioMostrador.toString(),
      precioTaller:    r.precioTaller.toString(),
      precioMayoreo:   r.precioMayoreo?.toString() ?? '',
      stockActual:     r.stockActual.toString(),
      stockMinimo:     r.stockMinimo.toString(),
      proveedorId:     ''
    })
    setError('')
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre || !form.costoCompra || !form.precioMostrador) {
      setError('Código, nombre, costo y precio son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const payload = {
        codigo:          form.codigo,
        nombre:          form.nombre,
        descripcion:     form.descripcion   || undefined,
        marca:           form.marca         || undefined,
        costoCompra:     Number(form.costoCompra),
        margenGanancia:  Number(form.margenGanancia),
        precioMostrador: Number(form.precioMostrador),
        precioTaller:    Number(form.precioTaller),
        precioMayoreo:   form.precioMayoreo ? Number(form.precioMayoreo) : undefined,
        stockActual:     Number(form.stockActual),
        stockMinimo:     Number(form.stockMinimo),
        proveedorId:     form.proveedorId   || undefined
      }
      if (editando) {
        await actualizarRefaccion(editando.id, payload)
      } else {
        await crearRefaccion(payload)
      }
      setModalAbierto(false)
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEntrada = async () => {
    if (!cantEntrada || Number(cantEntrada) <= 0) return
    setGuardando(true)
    try {
      await entradaInventario(
        modalEntrada!.id,
        Number(cantEntrada),
        motivoEntrada || 'Entrada de mercancía'
      )
      setModalEntrada(null)
      setCantEntrada('')
      setMotivoEntrada('')
      cargar()
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await eliminarRefaccion(id)
      setConfirmElim(null)
      cargar()
    } catch {
      alert('Error al eliminar')
    }
  }

  const stockBajoCount = refacciones.filter(r => r.stockBajo).length

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">
            {refacciones.length} refacción{refacciones.length !== 1 ? 'es' : ''}
            {stockBajoCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                · {stockBajoCount} con stock bajo
              </span>
            )}
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm
                     font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          + Nueva refacción
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por código, nombre o marca..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg
                       text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-gray-400 hover:text-gray-600"
            >×</button>
          )}
        </div>

        {/* Filtro stock bajo */}
        <button
          onClick={() => setSoloStockBajo(s => !s)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm
                      font-medium transition-colors ${soloStockBajo
            ? 'bg-red-600 text-white'
            : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
        >
          ⚠️ Stock bajo {stockBajoCount > 0 && `(${stockBajoCount})`}
        </button>

        {/* Toggle vista */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setVista('tabla')}
            className={`px-3 py-2 text-sm transition-colors ${vista === 'tabla'
              ? 'bg-gray-800 text-white'
              : 'text-gray-600 hover:bg-gray-50'}`}
          >
            ☰ Tabla
          </button>
          <button
            onClick={() => setVista('tarjetas')}
            className={`px-3 py-2 text-sm transition-colors ${vista === 'tarjetas'
              ? 'bg-gray-800 text-white'
              : 'text-gray-600 hover:bg-gray-50'}`}
          >
            ⊞ Tarjetas
          </button>
        </div>
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : refacciones.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📦</div>
          <div className="text-gray-500 font-medium">
            {busqueda ? 'No se encontraron refacciones' : 'Aún no hay refacciones registradas'}
          </div>
        </div>
      ) : vista === 'tabla' ? (

        // ── Vista tabla ──────────────────────────────────────
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Código
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Nombre / Marca
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Costo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Mostrador
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Taller
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Stock
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Proveedor
                  </th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refacciones.map(r => (
                  <tr
                    key={r.id}
                    className={`hover:bg-gray-50 transition-colors
                      ${r.stockBajo ? 'bg-red-50/40' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-gray-600">
                        {r.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{r.nombre}</div>
                      {r.marca && (
                        <div className="text-xs text-gray-400">{r.marca}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      ${Number(r.costoCompra).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      ${Number(r.precioMostrador).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      ${Number(r.precioTaller).toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm
                          ${r.stockBajo ? 'text-red-600' : 'text-gray-800'}`}>
                          {r.stockActual}
                        </span>
                        <span className="text-gray-400 text-xs">
                          / mín {r.stockMinimo}
                        </span>
                        {r.stockBajo && (
                          <span className="text-red-500 text-xs">⚠️</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.proveedor?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModalEntrada(r)}
                          className="text-xs text-green-600 hover:bg-green-50
                                     px-2.5 py-1.5 rounded-lg transition-colors"
                          title="Entrada de inventario"
                        >
                          + Stock
                        </button>
                        <button
                          onClick={() => abrirEditar(r)}
                          className="text-xs text-gray-500 hover:text-blue-600
                                     px-2.5 py-1.5 rounded-lg hover:bg-blue-50
                                     transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmElim(r.id)}
                          className="text-xs text-gray-500 hover:text-red-600
                                     px-2.5 py-1.5 rounded-lg hover:bg-red-50
                                     transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        // ── Vista tarjetas ───────────────────────────────────
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {refacciones.map(r => (
            <div
              key={r.id}
              className={`bg-white rounded-xl border p-5 hover:shadow-sm
                          transition-shadow ${r.stockBajo
                ? 'border-red-200 bg-red-50/30'
                : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 truncate">{r.nombre}</div>
                  {r.marca && (
                    <div className="text-xs text-gray-400">{r.marca}</div>
                  )}
                </div>
                <span className="font-mono text-xs bg-gray-100 text-gray-600
                                 font-bold px-2 py-1 rounded ml-2 shrink-0">
                  {r.codigo}
                </span>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-400 mb-0.5">Costo</div>
                  <div className="text-sm font-medium text-gray-700">
                    ${Number(r.costoCompra).toLocaleString('es-MX')}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="text-xs text-blue-400 mb-0.5">Mostrador</div>
                  <div className="text-sm font-bold text-blue-700">
                    ${Number(r.precioMostrador).toLocaleString('es-MX')}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-2">
                  <div className="text-xs text-purple-400 mb-0.5">Taller</div>
                  <div className="text-sm font-bold text-purple-700">
                    ${Number(r.precioTaller).toLocaleString('es-MX')}
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className={`flex items-center justify-between rounded-lg
                               px-3 py-2 mb-4 ${r.stockBajo
                ? 'bg-red-100'
                : 'bg-green-50'}`}
              >
                <span className="text-xs text-gray-500">Stock actual</span>
                <div className="flex items-center gap-2">
                  {r.stockBajo && <span className="text-xs">⚠️</span>}
                  <span className={`font-bold ${r.stockBajo
                    ? 'text-red-600' : 'text-green-700'}`}>
                    {r.stockActual} pzas
                  </span>
                  <span className="text-xs text-gray-400">
                    mín {r.stockMinimo}
                  </span>
                </div>
              </div>

              {/* Proveedor */}
              {r.proveedor && (
                <div className="text-xs text-gray-400 mb-3">
                  📦 {r.proveedor.nombre}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setModalEntrada(r)}
                  className="flex-1 text-xs text-green-600 font-medium
                             py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                >
                  + Entrada
                </button>
                <button
                  onClick={() => abrirEditar(r)}
                  className="flex-1 text-xs text-gray-600 py-1.5 rounded-lg
                             hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => setConfirmElim(r.id)}
                  className="flex-1 text-xs text-gray-600 py-1.5 rounded-lg
                             hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal crear / editar ─────────────────────────── */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl
                          max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-800">
                {editando ? 'Editar refacción' : 'Nueva refacción'}
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-5">

              {/* Código y nombre */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    value={form.codigo}
                    onChange={e => setForm(f => ({
                      ...f, codigo: e.target.value.toUpperCase()
                    }))}
                    placeholder="BAL-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm font-mono focus:outline-none
                               focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Balatas delanteras"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Marca y proveedor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca
                  </label>
                  <input
                    value={form.marca}
                    onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                    placeholder="Brembo, Bendix..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <select
                    value={form.proveedorId}
                    onChange={e => setForm(f => ({ ...f, proveedorId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Costo y margen — calculan precio automático */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-semibold text-amber-800">
                  💡 Costo y ganancia — el precio se calcula solo
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo de compra *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2
                                       text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={form.costoCompra}
                        onChange={e => {
                          setForm(f => ({ ...f, costoCompra: e.target.value }))
                          calcularPrecios(e.target.value, form.margenGanancia)
                        }}
                        placeholder="0.00"
                        className="w-full pl-7 border border-gray-300 rounded-lg
                                   px-3 py-2 text-sm focus:outline-none
                                   focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      % Margen ganancia
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={form.margenGanancia}
                        onChange={e => {
                          setForm(f => ({ ...f, margenGanancia: e.target.value }))
                          calcularPrecios(form.costoCompra, e.target.value)
                        }}
                        className="w-full border border-gray-300 rounded-lg
                                   px-3 py-2 text-sm focus:outline-none
                                   focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2
                                       text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Precios finales */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio mostrador *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2
                                     text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.precioMostrador}
                      onChange={e => setForm(f => ({
                        ...f, precioMostrador: e.target.value
                      }))}
                      className="w-full pl-7 border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none
                                 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio taller
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2
                                     text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.precioTaller}
                      onChange={e => setForm(f => ({
                        ...f, precioTaller: e.target.value
                      }))}
                      className="w-full pl-7 border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none
                                 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio mayoreo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2
                                     text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.precioMayoreo}
                      onChange={e => setForm(f => ({
                        ...f, precioMayoreo: e.target.value
                      }))}
                      placeholder="Opcional"
                      className="w-full pl-7 border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none
                                 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stockActual}
                    onChange={e => setForm(f => ({ ...f, stockActual: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock mínimo
                    <span className="text-gray-400 font-normal ml-1">
                      (alerta de reorden)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stockMinimo}
                    onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  placeholder="Compatible con Aveo 2015-2020..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium
                             rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {guardando
                    ? 'Guardando...'
                    : editando ? 'Guardar cambios' : 'Crear refacción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal entrada de inventario ──────────────────── */}
      {modalEntrada && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Entrada de inventario</h2>
              <button
                onClick={() => setModalEntrada(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-xl px-4 py-3">
                <div className="text-sm font-semibold text-blue-800">
                  {modalEntrada.nombre}
                </div>
                <div className="text-xs text-blue-500 mt-0.5">
                  Stock actual: {modalEntrada.stockActual} piezas
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad a agregar *
                </label>
                <input
                  type="number"
                  min="1"
                  value={cantEntrada}
                  onChange={e => setCantEntrada(e.target.value)}
                  placeholder="10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <input
                  value={motivoEntrada}
                  onChange={e => setMotivoEntrada(e.target.value)}
                  placeholder="Compra a Mayasa, ajuste de inventario..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {cantEntrada && Number(cantEntrada) > 0 && (
                <div className="bg-green-50 rounded-lg px-4 py-2.5 text-sm text-green-700">
                  Stock nuevo: <span className="font-bold">
                    {modalEntrada.stockActual + Number(cantEntrada)} piezas
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalEntrada(null)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300
                             rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEntrada}
                  disabled={guardando || !cantEntrada}
                  className="flex-1 px-4 py-2 text-sm bg-green-600 text-white
                             rounded-lg hover:bg-green-700 disabled:bg-green-400"
                >
                  {guardando ? 'Guardando...' : 'Registrar entrada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmElim && (
        <div className="fixed inset-0 bg-black/50 flex items-center
                        justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="font-bold text-gray-800">¿Eliminar refacción?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Se desactivará pero se conserva el historial de ventas.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmElim(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300
                           rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmElim)}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white
                           rounded-lg hover:bg-red-700"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}