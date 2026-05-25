import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

interface ResultadosBusqueda {
  clientes:    { id: string; nombre: string; telefono?: string; email?: string }[]
  ordenes:     { id: string; numero: number; estado: string; cliente?: { nombre: string }; vehiculo?: { marca: string; modelo: string; placa: string } }[]
  refacciones: { id: string; codigo: string; nombre: string; stockActual: number; precioMostrador: string }[]
  vehiculos:   { id: string; placa: string; marca: string; modelo: string; anio: number; cliente?: { nombre: string } }[]
  total:       number
}

const colorEstado: Record<string, string> = {
  RECIBIDO:            'bg-blue-100 text-blue-700',
  EN_PROCESO:          'bg-yellow-100 text-yellow-700',
  EN_ESPERA_REFACCION: 'bg-orange-100 text-orange-700',
  LISTO:               'bg-green-100 text-green-700',
  ENTREGADO:           'bg-gray-100 text-gray-600',
  CANCELADO:           'bg-red-100 text-red-600',
}

const fmt = (n: any) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

export default function BusquedaGlobal() {
  const navigate  = useNavigate()
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<ResultadosBusqueda | null>(null)
  const [cargando,setCargando]= useState(false)
  const [abierto, setAbierto] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Atajos de teclado: Ctrl+K o / para enfocar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault()
        inputRef.current?.focus()
        setAbierto(true)
      }
      if (e.key === 'Escape') {
        setAbierto(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const buscar = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return }
    setCargando(true)
    try {
      const { data } = await api.get('/buscar', { params: { q } })
      setResults(data)
    } catch {
      setResults(null)
    } finally {
      setCargando(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    setAbierto(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(v), 280)
  }

  const irA = (ruta: string) => {
    navigate(ruta)
    setAbierto(false)
    setQuery('')
    setResults(null)
  }

  const hayResultados = results && results.total > 0

  return (
    <div ref={wrapperRef} className="relative px-3 py-2">
      {/* Input de búsqueda */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.length >= 2) setAbierto(true) }}
          placeholder="Buscar... (Ctrl+K)"
          className="w-full bg-gray-800 text-gray-200 text-sm rounded-lg
                     pl-8 pr-3 py-2 placeholder-gray-500
                     border border-gray-700 focus:border-blue-500
                     focus:outline-none focus:ring-1 focus:ring-blue-500
                     transition-colors"
        />
        {cargando && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2
                           w-3 h-3 border-2 border-blue-400 border-t-transparent
                           rounded-full animate-spin" />
        )}
      </div>

      {/* Dropdown de resultados */}
      {abierto && query.length >= 2 && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50
                        bg-white rounded-xl shadow-2xl border border-gray-200
                        max-h-96 overflow-y-auto">

          {!hayResultados && !cargando && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              Sin resultados para "<span className="font-medium text-gray-600">{query}</span>"
            </div>
          )}

          {/* ── Órdenes ── */}
          {results && results.ordenes.length > 0 && (
            <section>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100
                              text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Órdenes de trabajo
              </div>
              {results.ordenes.map(o => (
                <button
                  key={o.id}
                  onClick={() => irA(`/ordenes?buscar=${o.numero}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                             hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="text-base">🔧</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">
                      Orden #{o.numero}
                      {o.vehiculo && (
                        <span className="text-gray-500 font-normal">
                          {' '}— {o.vehiculo.marca} {o.vehiculo.modelo}
                          <span className="font-mono text-xs ml-1 text-gray-400">
                            ({o.vehiculo.placa})
                          </span>
                        </span>
                      )}
                    </div>
                    {o.cliente && (
                      <div className="text-xs text-gray-400">{o.cliente.nombre}</div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0
                    ${colorEstado[o.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                    {o.estado.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </section>
          )}

          {/* ── Clientes ── */}
          {results && results.clientes.length > 0 && (
            <section>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100
                              text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Clientes
              </div>
              {results.clientes.map(c => (
                <button
                  key={c.id}
                  onClick={() => irA(`/clientes?buscar=${encodeURIComponent(c.nombre)}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                             hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="text-base">👤</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{c.nombre}</div>
                    <div className="text-xs text-gray-400">
                      {[c.telefono, c.email].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* ── Refacciones ── */}
          {results && results.refacciones.length > 0 && (
            <section>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100
                              text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Inventario
              </div>
              {results.refacciones.map(r => (
                <button
                  key={r.id}
                  onClick={() => irA(`/inventario?buscar=${encodeURIComponent(r.nombre)}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                             hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="text-base">📦</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{r.nombre}</div>
                    <div className="text-xs font-mono text-gray-400">{r.codigo}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium text-gray-700">{fmt(r.precioMostrador)}</div>
                    <div className={`text-xs ${r.stockActual <= 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {r.stockActual} pzas
                    </div>
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* ── Vehículos ── */}
          {results && results.vehiculos.length > 0 && (
            <section>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100
                              text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Vehículos
              </div>
              {results.vehiculos.map(v => (
                <button
                  key={v.id}
                  onClick={() => irA(`/vehiculos?buscar=${encodeURIComponent(v.placa)}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                             hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="text-base">🚗</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">
                      {v.marca} {v.modelo}
                      <span className="font-mono text-xs ml-1 text-gray-400">({v.placa})</span>
                    </div>
                    {v.cliente && (
                      <div className="text-xs text-gray-400">{v.cliente.nombre}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">{v.anio}</div>
                </button>
              ))}
            </section>
          )}

          {/* Pie con atajo */}
          {hayResultados && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100
                            text-xs text-gray-400 flex justify-between">
              <span>{results.total} resultado{results.total !== 1 ? 's' : ''}</span>
              <span>Esc para cerrar</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
