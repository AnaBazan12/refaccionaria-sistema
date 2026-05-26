import { useEffect, useRef, useState } from 'react'
import { getOrdenes, cambiarEstado, marcarPagada, getMecanicos } from '../services/orden.service'
import { colorEstado, labelEstado, ESTADOS_ORDEN } from '../utils/estados'
import ModalCrearOrden from '../components/ui/ModalCrearOrden'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import OrdenDetalleModal from '../components/ui/OrdenDetalle'
import Paginacion from '../components/ui/Paginacion'
import { LIMITE } from '../constants/paginacion'
import WhatsAppToast from '../components/ui/WhatsAppToast'

const fmt = (n: any) => `$${Number(n ?? 0).toLocaleString('es-MX')}`

export default function Ordenes() {
  const [ordenes,          setOrdenes]          = useState<any[]>([])
  const [cargando,         setCargando]          = useState(true)
  const [filtroEstado,     setFiltroEstado]      = useState('')
  const [busqueda,         setBusqueda]          = useState('')
  const [filtroMecanico,   setFiltroMecanico]    = useState('')
  const [fechaDesde,       setFechaDesde]        = useState('')
  const [fechaHasta,       setFechaHasta]        = useState('')
  const [mecanicos,        setMecanicos]         = useState<any[]>([])
  const [mostrarFiltros,   setMostrarFiltros]    = useState(false)
  const [modalAbierto,     setModalAbierto]      = useState(false)
  const [verArchivadas,    setVerArchivadas]     = useState(false)
  const [ordenSeleccionada,setOrdenSeleccionada] = useState<any>(null)
  const [pagina,           setPagina]            = useState(1)
  const [totalPaginas,     setTotalPaginas]      = useState(1)
  const [total,            setTotal]             = useState(0)
  const [waToast,          setWaToast]           = useState<{ url: string; nombre: string } | null>(null)

  const { usuario } = useAuth()
  const esMecanico = usuario?.rol === 'MECANICO'
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cuenta cuántos filtros avanzados están activos
  const filtrosActivos = [filtroMecanico, fechaDesde, fechaHasta].filter(Boolean).length

  const cargar = async (pag = 1) => {
    setCargando(true)
    try {
      const resp = await getOrdenes({
        ...(filtroEstado    ? { estado:      filtroEstado }    : {}),
        ...(filtroMecanico  ? { mecanicoId:  filtroMecanico }  : {}),
        ...(busqueda.trim() ? { q:           busqueda.trim() } : {}),
        ...(fechaDesde      ? { fechaDesde }                   : {}),
        ...(fechaHasta      ? { fechaHasta }                   : {}),
        archivadas: verArchivadas,
        page:  pag,
        limit: LIMITE.ORDENES,
      })
      setOrdenes(Array.isArray(resp) ? resp : (resp.data ?? []))
      setTotal(Array.isArray(resp) ? resp.length : (resp.total ?? 0))
      setTotalPaginas(Array.isArray(resp) ? 1 : (resp.totalPaginas ?? 1))
    } catch (err) {
      console.error('Error cargando órdenes:', err)
    } finally {
      setCargando(false)
    }
  }

  // Cargar mecánicos una sola vez
  useEffect(() => {
    if (!esMecanico) {
      getMecanicos().then(r => setMecanicos(Array.isArray(r) ? r : (r?.data ?? [])))
    }
  }, [esMecanico])

  // Refrescar cuando cambian los filtros directos
  useEffect(() => {
    setPagina(1)
    cargar(1)
  }, [filtroEstado, filtroMecanico, fechaDesde, fechaHasta, verArchivadas])

  // Debounce en la búsqueda de texto
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPagina(1)
      cargar(1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [busqueda])

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroEstado('')
    setFiltroMecanico('')
    setFechaDesde('')
    setFechaHasta('')
  }

  const hayFiltros = busqueda || filtroEstado || filtroMecanico || fechaDesde || fechaHasta

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      const { data } = await api.patch(`/ordenes/${id}/estado`, { estado: nuevoEstado })
      cargar(pagina)
      // Si el backend devuelve un link de WhatsApp (orden pasó a LISTO), mostrar toast
      if (data?.whatsapp?.url && data?.orden?.cliente?.nombre) {
        setWaToast({ url: data.whatsapp.url, nombre: data.orden.cliente.nombre })
        // Auto-cerrar el toast después de 20 segundos
        setTimeout(() => setWaToast(null), 20000)
      }
    } catch { alert('No se pudo cambiar el estado') }
  }

  const handlePagar = async (id: string) => {
    try { await marcarPagada(id); cargar(pagina) }
    catch { alert('Error al procesar pago') }
  }

  const handleArchivarIndividual = async (id: string) => {
    try { await api.patch(`/ordenes/${id}/archivar`); cargar(pagina) }
    catch { alert('Error al archivar la orden') }
  }

  const handleArchivarViejas = async () => {
    if (!confirm('¿Archivar todas las órdenes entregadas y pagadas de más de 30 días?')) return
    try { await api.post('/ordenes/archivar-viejas'); cargar(pagina) }
    catch { alert('Error al archivar órdenes antiguas') }
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Encabezado ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {verArchivadas ? 'Archivo de Órdenes' : esMecanico ? 'Mis órdenes asignadas' : 'Órdenes de trabajo'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? 'orden' : 'órdenes'}
            {hayFiltros ? ' — filtradas' : verArchivadas ? ' archivadas' : ' activas'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setVerArchivadas(!verArchivadas); setFiltroEstado('') }}
            className={`text-xs px-4 py-2 rounded-lg border font-medium transition-all
              ${verArchivadas
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {verArchivadas ? '← Ver activas' : '📁 Archivadas'}
          </button>
          {!esMecanico && !verArchivadas && (
            <button
              onClick={() => setModalAbierto(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-100"
            >
              + Nueva orden
            </button>
          )}
        </div>
      </div>

      {/* ── Barra de búsqueda + toggle filtros ──────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, placa o # de orden…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {/* Toggle filtros avanzados */}
        {!esMecanico && (
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
              ${mostrarFiltros || filtrosActivos > 0
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <span>⚙️</span>
            <span>Filtros</span>
            {filtrosActivos > 0 && (
              <span className="bg-white text-blue-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {filtrosActivos}
              </span>
            )}
          </button>
        )}

        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500
                       hover:bg-red-50 text-sm font-medium transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Panel de filtros avanzados ───────────────────────── */}
      {mostrarFiltros && !esMecanico && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Mecánico */}
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1.5">Mecánico</label>
            <select
              value={filtroMecanico}
              onChange={e => setFiltroMecanico(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los mecánicos</option>
              {mecanicos.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha desde */}
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1.5">Fecha desde</label>
            <input
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha hasta */}
          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1.5">Fecha hasta</label>
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* ── Chips de estado ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroEstado('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
              ${!filtroEstado
                ? 'bg-white text-gray-800 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:bg-gray-200'}`}
          >
            Todas
          </button>
          {ESTADOS_ORDEN.map(estado => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado === filtroEstado ? '' : estado)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                ${filtroEstado === estado
                  ? `bg-white shadow-sm border border-gray-200 ${colorEstado[estado]}`
                  : 'text-gray-500 hover:bg-gray-200'}`}
            >
              {labelEstado[estado]}
            </button>
          ))}
        </div>
        {!esMecanico && !verArchivadas && (
          <button
            onClick={handleArchivarViejas}
            className="text-xs text-amber-600 font-bold hover:text-amber-700 px-3 py-1.5
                       rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            📦 Archivar +30d
          </button>
        )}
      </div>

      {/* ── Lista de órdenes ─────────────────────────────────── */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Cargando órdenes…</p>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">{hayFiltros ? '🔍' : '📋'}</div>
          <p className="text-gray-500 font-medium">
            {hayFiltros ? 'No se encontraron órdenes con esos filtros' : 'No hay órdenes'}
          </p>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="mt-3 text-sm text-blue-500 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {ordenes.map(orden => (
            <div
              key={orden.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">

                  {/* Badges + acción */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-sm font-mono font-black text-gray-300">
                      #{orden.numero}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight ${colorEstado[orden.estado]}`}>
                      {labelEstado[orden.estado]}
                    </span>
                    {orden.pagado && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">
                        ✓ PAGADA
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-1">
                      {new Date(orden.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </span>
                    <button
                      onClick={() => setOrdenSeleccionada(orden)}
                      className="text-xs text-blue-500 hover:text-blue-700 hover:underline ml-auto"
                    >
                      Ver detalle →
                    </button>
                  </div>

                  {/* Datos */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cliente</div>
                      <div className="text-sm font-bold text-gray-800 truncate">{orden.cliente?.nombre}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Vehículo</div>
                      <div className="text-sm font-bold text-gray-700 truncate">
                        {orden.vehiculo?.marca} {orden.vehiculo?.modelo}
                      </div>
                      <div className="text-xs font-mono text-gray-400">{orden.vehiculo?.placa}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Mecánico</div>
                      <div className={`text-sm font-medium truncate ${orden.mecanico ? 'text-gray-700' : 'text-amber-500'}`}>
                        {orden.mecanico?.nombre ?? '⚠️ Sin asignar'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total</div>
                      <div className="text-sm font-black text-blue-600">{fmt(orden.total)}</div>
                      {Number(orden.saldoPendiente) > 0 && (
                        <div className="text-xs text-red-500">Debe {fmt(orden.saldoPendiente)}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-row md:flex-col gap-2 border-t md:border-t-0 md:border-l md:pl-4 pt-3 md:pt-0 border-gray-100">
                  {!verArchivadas && (
                    <select
                      value={orden.estado}
                      onChange={e => handleCambiarEstado(orden.id, e.target.value)}
                      className="text-xs font-bold border border-gray-200 rounded-lg px-3 py-2
                                 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {(esMecanico
                        ? ['EN_PROCESO', 'EN_ESPERA_REFACCION', 'LISTO']
                        : ESTADOS_ORDEN
                      ).map(e => (
                        <option key={e} value={e}>{labelEstado[e]}</option>
                      ))}
                    </select>
                  )}

                  {!esMecanico && !verArchivadas && (
                    <>
                      {!orden.pagado && orden.estado === 'ENTREGADO' && (
                        <button
                          onClick={() => handlePagar(orden.id)}
                          className="text-xs font-bold bg-green-600 text-white px-4 py-2
                                     rounded-lg hover:bg-green-700 transition-colors"
                        >
                          💸 Cobrar
                        </button>
                      )}
                      {orden.estado === 'ENTREGADO' && orden.pagado && (
                        <button
                          onClick={() => handleArchivarIndividual(orden.id)}
                          className="text-xs font-bold text-gray-400 hover:text-gray-700
                                     hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors
                                     border border-dashed border-gray-200"
                        >
                          📦 Archivar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Paginación ───────────────────────────────────────── */}
      <Paginacion
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        total={total}
        limite={LIMITE.ORDENES}
        onCambiar={p => { setPagina(p); cargar(p) }}
        cargando={cargando}
      />

      {/* ── Toast de WhatsApp ────────────────────────────────── */}
      {waToast && (
        <WhatsAppToast
          nombre={waToast.nombre}
          url={waToast.url}
          onCerrar={() => setWaToast(null)}
        />
      )}

      {/* ── Modales ──────────────────────────────────────────── */}
      {ordenSeleccionada && (
        <OrdenDetalleModal
          orden={ordenSeleccionada}
          onCerrar={() => setOrdenSeleccionada(null)}
          onActualizar={() => {
            cargar(pagina)
            api.get(`/ordenes/${ordenSeleccionada.id}`)
               .then(({ data }) => setOrdenSeleccionada(data))
          }}
        />
      )}

      {modalAbierto && (
        <ModalCrearOrden
          onCerrar={() => setModalAbierto(false)}
          onCreada={() => cargar(1)}   // solo recarga; el modal maneja su propio cierre
        />
      )}
    </div>
  )
}
