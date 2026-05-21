import { useEffect, useState, useMemo } from 'react'
import {
  getRefacciones, buscarRefaccion, crearRefaccion,
  actualizarRefaccion, entradaInventario,
  eliminarRefaccion, getProveedores, getMetricasInventario
} from '../services/inventario.service'
import Paginacion from '../components/ui/Paginacion'
import { LIMITE } from '../constants/paginacion'

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

interface Metricas {
  totalProductos:      number
  totalPiezas:         number
  valorInvertido:      number
  utilidadPotencial:   number
  margenPromedio:      number
  stockBajoCount:      number
  top5ValorInventario: {
    id: string; codigo: string; nombre: string
    valor: number; utilidad: number; margen: number; stock: number
  }[]
}

const formVacio = {
  codigo: '', nombre: '', descripcion: '', marca: '',
  costoCompra: '', margenGanancia: '30',
  precioMostrador: '', precioTaller: '', precioMayoreo: '',
  stockActual: '0', stockMinimo: '1', proveedorId: ''
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${fmt(n)}`
}

// ── Tarjeta de métrica ───────────────────────────────────────
const MetricCard = ({
  icono, titulo, valor, sub, color
}: {
  icono: string; titulo: string; valor: string; sub?: string
  color: 'blue' | 'green' | 'purple' | 'red'
}) => {
  const colores = {
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    green:  'bg-green-50  border-green-200  text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    red:    'bg-red-50    border-red-200    text-red-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colores[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icono}</span>
        <span className="text-xs font-medium opacity-70 uppercase tracking-wide">
          {titulo}
        </span>
      </div>
      <div className="text-2xl font-bold">{valor}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  )
}

// ── Badge de margen ──────────────────────────────────────────
const MargenBadge = ({ margen }: { margen: number }) => {
  const color = margen >= 40
    ? 'bg-green-100 text-green-700'
    : margen >= 25
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {margen.toFixed(0)}%
    </span>
  )
}

export default function Inventario() {
  const [refacciones,   setRefacciones]   = useState<Refaccion[]>([])
  const [metricas,      setMetricas]      = useState<Metricas | null>(null)
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
  const [pagina,        setPagina]        = useState(1)
  const [totalPaginas,  setTotalPaginas]  = useState(1)
  const [total,         setTotal]         = useState(0)
  const [ordenarPor,    setOrdenarPor]    = useState<'nombre' | 'valor' | 'margen' | 'stock'>('nombre')
  const [mostrarTop5,   setMostrarTop5]   = useState(false)

  const cargar = async (pag = pagina) => {
    setCargando(true)
    try {
      const [resp, p, met] = await Promise.all([
        getRefacciones({ stockBajo: soloStockBajo || undefined, page: pag, limit: LIMITE.INVENTARIO }),
        getProveedores(),
        getMetricasInventario(),
      ])
      const lista = Array.isArray(resp) ? resp : (resp.data ?? [])
      setRefacciones(lista)
      setTotal(Array.isArray(resp) ? resp.length : (resp.total ?? lista.length))
      setTotalPaginas(Array.isArray(resp) ? 1 : (resp.totalPaginas ?? 1))
      setProveedores(Array.isArray(p) ? p : (p.data ?? []))
      setMetricas(met)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { setPagina(1); cargar(1) }, [soloStockBajo])

  useEffect(() => {
    if (!busqueda.trim()) { setPagina(1); cargar(1); return }
    const timer = setTimeout(async () => {
      setCargando(true)
      try {
        const resultado = await buscarRefaccion(busqueda)
        const lista = Array.isArray(resultado) ? resultado : []
        setRefacciones(lista)
        setTotal(lista.length)
        setTotalPaginas(1)
        setPagina(1)
      } finally {
        setCargando(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [busqueda])

  // Ordenamiento client-side
  const refaccionesOrdenadas = useMemo(() => {
    const arr = [...refacciones]
    switch (ordenarPor) {
      case 'valor':  return arr.sort((a, b) =>
        (Number(b.costoCompra) * b.stockActual) - (Number(a.costoCompra) * a.stockActual))
      case 'margen': return arr.sort((a, b) =>
        Number(b.margenGanancia) - Number(a.margenGanancia))
      case 'stock':  return arr.sort((a, b) => b.stockActual - a.stockActual)
      default:       return arr.sort((a, b) => a.nombre.localeCompare(b.nombre))
    }
  }, [refacciones, ordenarPor])

  const calcularPrecios = (costo: string, margen: string) => {
    const c = parseFloat(costo)
    const m = parseFloat(margen)
    if (!c || !m) return
    const sinIva = c / (1 - m / 100)
    const conIva = sinIva * 1.16
    setForm(f => ({
      ...f,
      precioMostrador: conIva.toFixed(2),
      precioTaller:    conIva.toFixed(2)
    }))
  }

  const abrirCrear = () => {
    setEditando(null); setForm(formVacio); setError(''); setModalAbierto(true)
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
    setError(''); setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.codigo || !form.nombre || !form.costoCompra || !form.precioMostrador) {
      setError('Código, nombre, costo y precio son obligatorios'); return
    }
    setGuardando(true); setError('')
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
      if (editando) await actualizarRefaccion(editando.id, payload)
      else          await crearRefaccion(payload)
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
      await entradaInventario(modalEntrada!.id, Number(cantEntrada), motivoEntrada || 'Entrada de mercancía')
      setModalEntrada(null); setCantEntrada(''); setMotivoEntrada(''); cargar()
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await eliminarRefaccion(id); setConfirmElim(null); cargar()
    } catch { alert('Error al eliminar') }
  }

  const stockBajoCount = (refacciones ?? []).filter(r => r.stockBajo).length

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} refacción{total !== 1 ? 'es' : ''}
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

      {/* ── Métricas financieras ───────────────────────── */}
      {metricas && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              icono="💵"
              titulo="Valor en inventario"
              valor={fmtK(metricas.valorInvertido)}
              sub={`${metricas.totalProductos} productos · ${metricas.totalPiezas.toLocaleString('es-MX')} pzas`}
              color="blue"
            />
            <MetricCard
              icono="📈"
              titulo="Utilidad potencial"
              valor={fmtK(metricas.utilidadPotencial)}
              sub={`Si vendes todo al precio mostrador`}
              color="green"
            />
            <MetricCard
              icono="🎯"
              titulo="Margen promedio"
              valor={`${metricas.margenPromedio.toFixed(1)}%`}
              sub={`En todos los productos`}
              color="purple"
            />
            <MetricCard
              icono="⚠️"
              titulo="Stock bajo"
              valor={metricas.stockBajoCount.toString()}
              sub={`producto${metricas.stockBajoCount !== 1 ? 's' : ''} bajo mínimo`}
              color="red"
            />
          </div>

          {/* Top 5 más valiosos — colapsable */}
          {metricas.top5ValorInventario.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setMostrarTop5(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3
                           hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-700">
                  🏆 Top 5 productos por valor en inventario
                </span>
                <span className="text-gray-400 text-sm">{mostrarTop5 ? '▲' : '▼'}</span>
              </button>
              {mostrarTop5 && (
                <div className="border-t border-gray-100">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-50
                                  text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Producto</div>
                    <div className="col-span-2 text-right">Stock</div>
                    <div className="col-span-2 text-right">Valor inv.</div>
                    <div className="col-span-2 text-right">Utilidad pot.</div>
                    <div className="col-span-1 text-right">Margen</div>
                  </div>
                  {metricas.top5ValorInventario.map((p, i) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-12 gap-2 px-5 py-3 text-sm
                                 border-t border-gray-50 hover:bg-gray-50/50"
                    >
                      <div className="col-span-1 text-gray-400 font-bold">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </div>
                      <div className="col-span-4">
                        <div className="font-medium text-gray-800 truncate">{p.nombre}</div>
                        <div className="text-xs text-gray-400 font-mono">{p.codigo}</div>
                      </div>
                      <div className="col-span-2 text-right text-gray-600 font-medium">
                        {p.stock.toLocaleString('es-MX')} pzas
                      </div>
                      <div className="col-span-2 text-right font-bold text-blue-700">
                        ${fmt(p.valor)}
                      </div>
                      <div className="col-span-2 text-right font-bold text-green-700">
                        ${fmt(p.utilidad)}
                      </div>
                      <div className="col-span-1 text-right">
                        <MargenBadge margen={p.margen} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Filtros y búsqueda ────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >×</button>
          )}
        </div>

        {/* Ordenar por */}
        <select
          value={ordenarPor}
          onChange={e => setOrdenarPor(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                     text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="nombre">Ordenar: Nombre</option>
          <option value="valor">Ordenar: Valor en inventario</option>
          <option value="margen">Ordenar: Margen %</option>
          <option value="stock">Ordenar: Stock actual</option>
        </select>

        {/* Stock bajo */}
        <button
          onClick={() => setSoloStockBajo(s => !s)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm
                      font-medium transition-colors ${soloStockBajo
            ? 'bg-red-600 text-white'
            : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
        >
          ⚠️ Stock bajo {stockBajoCount > 0 && `(${stockBajoCount})`}
        </button>

        {/* Vista */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setVista('tabla')}
            className={`px-3 py-2 text-sm transition-colors ${vista === 'tabla'
              ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            ☰ Tabla
          </button>
          <button
            onClick={() => setVista('tarjetas')}
            className={`px-3 py-2 text-sm transition-colors ${vista === 'tarjetas'
              ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            ⊞ Tarjetas
          </button>
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────── */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : refaccionesOrdenadas.length === 0 ? (
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nombre / Marca</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Costo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Mostrador</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    <span className="flex items-center gap-1">
                      Utilidad unit.
                      <span className="text-gray-400 font-normal">(unit)</span>
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 bg-blue-50/50">
                    Valor inv.
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Proveedor</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refaccionesOrdenadas.map(r => {
                  const utilidadUnit  = Number(r.precioMostrador) - Number(r.costoCompra)
                  const valorInv      = Number(r.costoCompra) * r.stockActual
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-50 transition-colors
                        ${r.stockBajo ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-gray-600">{r.codigo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{r.nombre}</div>
                        {r.marca && <div className="text-xs text-gray-400">{r.marca}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-600">${Number(r.costoCompra).toLocaleString('es-MX')}</div>
                        <MargenBadge margen={Number(r.margenGanancia)} />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        ${Number(r.precioMostrador).toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${
                          utilidadUnit > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${fmt(utilidadUnit)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${r.stockBajo ? 'text-red-600' : 'text-gray-800'}`}>
                            {r.stockActual}
                          </span>
                          <span className="text-gray-400 text-xs">/ mín {r.stockMinimo}</span>
                          {r.stockBajo && <span className="text-red-500 text-xs">⚠️</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 bg-blue-50/30">
                        <span className="font-bold text-blue-700 text-sm">
                          ${fmt(valorInv)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.proveedor?.nombre ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setModalEntrada(r)}
                            className="text-xs text-green-600 hover:bg-green-50
                                       px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            + Stock
                          </button>
                          <button
                            onClick={() => abrirEditar(r)}
                            className="text-xs text-gray-500 hover:text-blue-600
                                       px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmElim(r.id)}
                            className="text-xs text-gray-500 hover:text-red-600
                                       px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        // ── Vista tarjetas ───────────────────────────────────
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {refaccionesOrdenadas.map(r => {
            const utilidadUnit = Number(r.precioMostrador) - Number(r.costoCompra)
            const valorInv     = Number(r.costoCompra) * r.stockActual
            const utilidadInv  = utilidadUnit * r.stockActual
            return (
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
                    {r.marca && <div className="text-xs text-gray-400">{r.marca}</div>}
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <MargenBadge margen={Number(r.margenGanancia)} />
                    <span className="font-mono text-xs bg-gray-100 text-gray-600
                                     font-bold px-2 py-1 rounded">
                      {r.codigo}
                    </span>
                  </div>
                </div>

                {/* Precios */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
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
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-xs text-green-500 mb-0.5">Utilidad unit.</div>
                    <div className="text-sm font-bold text-green-700">
                      ${fmt(utilidadUnit)}
                    </div>
                  </div>
                </div>

                {/* Métricas financieras del inventario */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-blue-50/70 rounded-lg px-3 py-2">
                    <div className="text-xs text-blue-500 mb-0.5">Valor en inventario</div>
                    <div className="text-sm font-bold text-blue-800">${fmt(valorInv)}</div>
                    <div className="text-xs text-blue-400">{r.stockActual} pzas × ${Number(r.costoCompra).toLocaleString('es-MX')}</div>
                  </div>
                  <div className="bg-green-50/70 rounded-lg px-3 py-2">
                    <div className="text-xs text-green-500 mb-0.5">Utilidad potencial</div>
                    <div className="text-sm font-bold text-green-800">${fmt(utilidadInv)}</div>
                    <div className="text-xs text-green-400">Si vendes las {r.stockActual} pzas</div>
                  </div>
                </div>

                {/* Stock */}
                <div className={`flex items-center justify-between rounded-lg
                                 px-3 py-2 mb-3 ${r.stockBajo ? 'bg-red-100' : 'bg-gray-50'}`}>
                  <span className="text-xs text-gray-500">Stock actual</span>
                  <div className="flex items-center gap-2">
                    {r.stockBajo && <span className="text-xs">⚠️</span>}
                    <span className={`font-bold ${r.stockBajo ? 'text-red-600' : 'text-gray-700'}`}>
                      {r.stockActual} pzas
                    </span>
                    <span className="text-xs text-gray-400">mín {r.stockMinimo}</span>
                  </div>
                </div>

                {r.proveedor && (
                  <div className="text-xs text-gray-400 mb-3">📦 {r.proveedor.nombre}</div>
                )}

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
            )
          })}
        </div>
      )}

      {/* Paginación */}
      {!busqueda && (
        <Paginacion
          paginaActual={pagina}
          totalPaginas={totalPaginas}
          total={total}
          limite={LIMITE.INVENTARIO}
          onCambiar={(p) => { setPagina(p); cargar(p) }}
          cargando={cargando}
        />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input
                    value={form.codigo}
                    onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                    placeholder="BAL-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Balatas delanteras"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    value={form.marca}
                    onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                    placeholder="Brembo, Bendix..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
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

              {/* Costo y margen */}
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
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number" step="0.01" value={form.costoCompra}
                        onChange={e => {
                          setForm(f => ({ ...f, costoCompra: e.target.value }))
                          calcularPrecios(e.target.value, form.margenGanancia)
                        }}
                        placeholder="0.00"
                        className="w-full pl-7 border border-gray-300 rounded-lg
                                   px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">% Margen ganancia</label>
                    <div className="relative">
                      <input
                        type="number" step="1" min="0" max="100" value={form.margenGanancia}
                        onChange={e => {
                          setForm(f => ({ ...f, margenGanancia: e.target.value }))
                          calcularPrecios(form.costoCompra, e.target.value)
                        }}
                        className="w-full border border-gray-300 rounded-lg
                                   px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                </div>

                {/* Preview de utilidad */}
                {form.costoCompra && form.precioMostrador && (
                  <div className="bg-white rounded-lg px-4 py-2.5 text-sm border border-amber-200">
                    <span className="text-gray-500">Utilidad unitaria: </span>
                    <span className="font-bold text-green-700">
                      ${fmt(Number(form.precioMostrador) - Number(form.costoCompra))}
                    </span>
                    {form.stockActual && Number(form.stockActual) > 0 && (
                      <>
                        <span className="text-gray-400 mx-2">·</span>
                        <span className="text-gray-500">Utilidad potencial ({form.stockActual} pzas): </span>
                        <span className="font-bold text-green-700">
                          ${fmt((Number(form.precioMostrador) - Number(form.costoCompra)) * Number(form.stockActual))}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Precios finales */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio mostrador *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number" step="0.01" value={form.precioMostrador}
                      onChange={e => setForm(f => ({ ...f, precioMostrador: e.target.value }))}
                      className="w-full pl-7 border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio taller</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number" step="0.01" value={form.precioTaller}
                      onChange={e => setForm(f => ({ ...f, precioTaller: e.target.value }))}
                      className="w-full pl-7 border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio mayoreo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number" step="0.01" value={form.precioMayoreo}
                      onChange={e => setForm(f => ({ ...f, precioMayoreo: e.target.value }))}
                      placeholder="Opcional"
                      className="w-full pl-7 border border-gray-300 rounded-lg
                                 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                  <input
                    type="number" min="0" value={form.stockActual}
                    onChange={e => setForm(f => ({ ...f, stockActual: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock mínimo
                    <span className="text-gray-400 font-normal ml-1">(alerta de reorden)</span>
                  </label>
                  <input
                    type="number" min="0" value={form.stockMinimo}
                    onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
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
                  type="button" onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={guardando}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium
                             rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear refacción'}
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
                <div className="text-sm font-semibold text-blue-800">{modalEntrada.nombre}</div>
                <div className="text-xs text-blue-500 mt-0.5">
                  Stock actual: {modalEntrada.stockActual} piezas
                </div>
                <div className="text-xs text-blue-400 mt-0.5">
                  Costo: ${Number(modalEntrada.costoCompra).toLocaleString('es-MX')} /pza
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad a agregar *
                </label>
                <input
                  type="number" min="1" value={cantEntrada}
                  onChange={e => setCantEntrada(e.target.value)}
                  placeholder="10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  value={motivoEntrada}
                  onChange={e => setMotivoEntrada(e.target.value)}
                  placeholder="Compra a Mayasa, ajuste de inventario..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {cantEntrada && Number(cantEntrada) > 0 && (
                <div className="bg-green-50 rounded-lg px-4 py-2.5 text-sm text-green-700 space-y-1">
                  <div>
                    Stock nuevo: <span className="font-bold">
                      {modalEntrada.stockActual + Number(cantEntrada)} piezas
                    </span>
                  </div>
                  <div className="text-xs text-green-600">
                    Inversión entrada: <span className="font-semibold">
                      ${fmt(Number(modalEntrada.costoCompra) * Number(cantEntrada))}
                    </span>
                  </div>
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
