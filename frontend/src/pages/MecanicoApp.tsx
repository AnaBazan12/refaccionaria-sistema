import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getOrdenes,
  agregarServicioOrden,
  getServicios,
  getOrdenPorId,
} from '../services/orden.service'
import api from '../services/api'
import WhatsAppToast from '../components/ui/WhatsAppToast'

// ── Helpers de estado ──────────────────────────────────────────────────────────
const ESTADO_COLOR: Record<string, string> = {
  RECIBIDO:             'bg-yellow-100 text-yellow-700',
  EN_PROCESO:           'bg-blue-100   text-blue-700',
  EN_ESPERA_REFACCION:  'bg-orange-100 text-orange-700',
  LISTO:                'bg-green-100  text-green-700',
  ENTREGADO:            'bg-gray-100   text-gray-600',
  CANCELADO:            'bg-red-100    text-red-700',
}
const ESTADO_LABEL: Record<string, string> = {
  RECIBIDO:            'Recibido',
  EN_PROCESO:          'En proceso',
  EN_ESPERA_REFACCION: 'Esperando refacción',
  LISTO:               'Listo',
  ENTREGADO:           'Entregado',
  CANCELADO:           'Cancelado',
}
// Qué estado sigue al actual para el mecánico
const SIGUIENTE_ESTADO: Record<string, string | null> = {
  RECIBIDO:            'EN_PROCESO',
  EN_PROCESO:          'LISTO',
  EN_ESPERA_REFACCION: 'EN_PROCESO',
  LISTO:               null,
  ENTREGADO:           null,
  CANCELADO:           null,
}
const BOTON_LABEL: Record<string, string> = {
  EN_PROCESO: '▶  Iniciar trabajo',
  LISTO:      '✅  Marcar como listo',
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function MecanicoApp() {
  const { usuario, logout } = useAuth()

  const [ordenes,   setOrdenes]   = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [cargando,  setCargando]  = useState(true)
  const [tab,       setTab]       = useState<'activas' | 'completadas'>('activas')
  const [detalle,   setDetalle]   = useState<any>(null)
  const [waToast,   setWaToast]   = useState<{ url: string; nombre: string } | null>(null)

  // ── Carga inicial ────────────────────────────────────────────────────────────
  const cargar = async () => {
    setCargando(true)
    try {
      const [rRec, rProc, rEsp, rListo, rSvcs] = await Promise.all([
        getOrdenes({ estado: 'RECIBIDO',            limit: 100 }),
        getOrdenes({ estado: 'EN_PROCESO',           limit: 100 }),
        getOrdenes({ estado: 'EN_ESPERA_REFACCION',  limit: 100 }),
        getOrdenes({ estado: 'LISTO',                limit: 50  }),
        getServicios(),
      ])
      const todas = [
        ...(rRec.data   ?? []),
        ...(rProc.data  ?? []),
        ...(rEsp.data   ?? []),
        ...(rListo.data ?? []),
      ]
      setOrdenes(todas)
      setServicios(Array.isArray(rSvcs) ? rSvcs : (rSvcs.data ?? []))
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  // ── Filtrado por tab ─────────────────────────────────────────────────────────
  const activas = ordenes.filter(o =>
    ['RECIBIDO', 'EN_PROCESO', 'EN_ESPERA_REFACCION'].includes(o.estado)
  )
  const completadas = ordenes.filter(o =>
    ['LISTO', 'ENTREGADO'].includes(o.estado)
  )
  const lista = tab === 'activas' ? activas : completadas

  // ── Abrir detalle ────────────────────────────────────────────────────────────
  const abrirDetalle = async (orden: any) => {
    try {
      const fresca = await getOrdenPorId(orden.id)
      setDetalle(fresca)
    } catch {
      setDetalle(orden)
    }
  }

  // ── Pantalla de carga ────────────────────────────────────────────────────────
  if (cargando) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-2">🔧</div>
        <div className="text-gray-500 text-sm">Cargando órdenes...</div>
      </div>
    </div>
  )

  const mostrarWaToast = (data: { url: string; nombre: string }) => {
    setWaToast(data)
    setTimeout(() => setWaToast(null), 20000)
  }

  // ── Detalle de orden ─────────────────────────────────────────────────────────
  if (detalle) return (
    <>
      <DetalleOrden
        orden={detalle}
        servicios={servicios}
        onVolver={() => setDetalle(null)}
        onRefresh={async () => {
          const fresca = await getOrdenPorId(detalle.id)
          setDetalle(fresca)
          await cargar()
        }}
        onWhatsApp={mostrarWaToast}
      />
      {waToast && (
        <WhatsAppToast
          nombre={waToast.nombre}
          url={waToast.url}
          onCerrar={() => setWaToast(null)}
        />
      )}
    </>
  )

  // ── Lista de órdenes ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <header className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10 shadow">
        <div>
          <div className="text-base font-bold">🔧 Taller</div>
          <div className="text-xs text-amber-400 mt-0.5">{usuario?.nombre}</div>
        </div>
        <button
          onClick={logout}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          Salir 🚪
        </button>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b sticky top-[68px] z-10">
        <button
          onClick={() => setTab('activas')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'activas'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500'
          }`}
        >
          Activas ({activas.length})
        </button>
        <button
          onClick={() => setTab('completadas')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'completadas'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500'
          }`}
        >
          Completadas ({completadas.length})
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 p-4 space-y-3 pb-6">
        {lista.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-2">{tab === 'activas' ? '🔧' : '✅'}</div>
            <div className="text-sm">
              {tab === 'activas' ? 'No hay órdenes activas' : 'Sin órdenes completadas'}
            </div>
          </div>
        ) : (
          lista.map(orden => (
            <button
              key={orden.id}
              onClick={() => abrirDetalle(orden)}
              className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100
                         active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {orden.vehiculo?.marca} {orden.vehiculo?.modelo}
                    {orden.vehiculo?.anio ? ` (${orden.vehiculo.anio})` : ''}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    🚗 {orden.vehiculo?.placa ?? '—'} · {orden.cliente?.nombre}
                  </div>
                  {orden.diagnostico && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5 line-clamp-1">
                      {orden.diagnostico}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ESTADO_COLOR[orden.estado]}`}>
                    {ESTADO_LABEL[orden.estado]}
                  </span>
                  <span className="text-xs text-gray-400">#{orden.numero}</span>
                </div>
              </div>
              <div className="mt-3 text-right text-blue-600 text-sm font-medium">
                Ver detalle →
              </div>
            </button>
          ))
        )}
      </div>
      {waToast && (
        <WhatsAppToast
          nombre={waToast.nombre}
          url={waToast.url}
          onCerrar={() => setWaToast(null)}
        />
      )}
    </div>
  )
}

// ── Detalle de una orden ───────────────────────────────────────────────────────
function DetalleOrden({
  orden,
  servicios,
  onVolver,
  onRefresh,
  onWhatsApp,
}: {
  orden:      any
  servicios:  any[]
  onVolver:   () => void
  onRefresh:  () => Promise<void>
  onWhatsApp: (data: { url: string; nombre: string }) => void
}) {
  const [modalServicio, setModalServicio] = useState(false)
  const [form,          setForm]          = useState({ servicioId: '', cantidad: 1, notas: '' })
  const [guardando,     setGuardando]     = useState(false)
  const [cambiandoEst,  setCambiandoEst]  = useState(false)
  const [mostrarIA,     setMostrarIA]     = useState(false)

  const siguienteEstado = SIGUIENTE_ESTADO[orden.estado]

  const handleEstado = async () => {
    if (!siguienteEstado) return
    setCambiandoEst(true)
    try {
      const { data } = await api.patch(`/ordenes/${orden.id}/estado`, { estado: siguienteEstado })
      await onRefresh()
      if (data?.whatsapp?.url && data?.orden?.cliente?.nombre) {
        onWhatsApp({ url: data.whatsapp.url, nombre: data.orden.cliente.nombre })
      }
    } catch {
      alert('Error al cambiar el estado')
    } finally {
      setCambiandoEst(false)
    }
  }

  const handleServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.servicioId) return
    setGuardando(true)
    try {
      const svc = servicios.find(s => s.id === form.servicioId)
      await agregarServicioOrden(orden.id, {
        servicioId:     form.servicioId,
        cantidad:       Number(form.cantidad),
        precioUnitario: svc?.precioBase ?? 0,
        notas:          form.notas || undefined,
      })
      setModalServicio(false)
      setForm({ servicioId: '', cantidad: 1, notas: '' })
      await onRefresh()
    } catch {
      alert('Error al agregar el servicio')
    } finally {
      setGuardando(false)
    }
  }

  const totalServicios = (orden.servicios ?? []).reduce(
    (s: number, x: any) => s + Number(x.precioUnitario ?? 0) * Number(x.cantidad ?? 1), 0
  )
  const totalRefacciones = (orden.detalle ?? []).reduce(
    (s: number, x: any) => s + Number(x.precioUnitario ?? 0) * Number(x.cantidad ?? 1), 0
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow">
        <button
          onClick={onVolver}
          className="text-gray-300 hover:text-white text-xl w-8 h-8 flex items-center justify-center"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">
            #{orden.numero} · {orden.vehiculo?.marca} {orden.vehiculo?.modelo}
          </div>
          <div className="text-xs text-gray-400 truncate">{orden.cliente?.nombre}</div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${ESTADO_COLOR[orden.estado]}`}>
          {ESTADO_LABEL[orden.estado]}
        </span>
      </header>

      {/* Cuerpo scrollable */}
      <div className="flex-1 p-4 space-y-4 pb-32">

        {/* Info del vehículo */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vehículo</p>
          <div className="space-y-1.5 text-sm">
            <Row label="Auto"    value={`${orden.vehiculo?.marca ?? ''} ${orden.vehiculo?.modelo ?? ''} ${orden.vehiculo?.anio ?? ''}`} />
            <Row label="Placas"  value={orden.vehiculo?.placa ?? '—'} />
            <Row label="Cliente" value={orden.cliente?.nombre ?? '—'} />
            {orden.mecanico?.nombre && <Row label="Mecánico" value={orden.mecanico.nombre} />}
            {orden.kilometraje && <Row label="Kilometraje" value={`${orden.kilometraje.toLocaleString('es-MX')} km`} />}
          </div>
          {orden.diagnostico && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <span className="font-semibold">Falla: </span>{orden.diagnostico}
            </div>
          )}
          {orden.observaciones && (
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
              <span className="font-semibold">Observaciones: </span>{orden.observaciones}
            </div>
          )}
        </section>

        {/* Servicios */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Servicios</p>
            {orden.estado !== 'LISTO' && orden.estado !== 'ENTREGADO' && orden.estado !== 'CANCELADO' && (
              <button
                onClick={() => setModalServicio(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold
                           px-3 py-1.5 rounded-lg transition-colors"
              >
                + Agregar
              </button>
            )}
          </div>

          {(!orden.servicios || orden.servicios.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin servicios registrados</p>
          ) : (
            <div className="space-y-2">
              {orden.servicios.map((s: any, i: number) => (
                <div key={i} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {s.servicio?.nombre ?? s.nombre ?? '—'}
                    </div>
                    {s.notas && <div className="text-xs text-gray-500 mt-0.5">{s.notas}</div>}
                    <div className="text-xs text-gray-400">× {s.cantidad}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 ml-3 shrink-0">
                    ${Number(s.precioUnitario * s.cantidad).toLocaleString('es-MX')}
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold text-gray-700 pt-2 border-t border-gray-100">
                <span>Subtotal servicios</span>
                <span>${totalServicios.toLocaleString('es-MX')}</span>
              </div>
            </div>
          )}
        </section>

        {/* Refacciones (solo lectura) */}
        {orden.detalle && orden.detalle.length > 0 && (
          <section className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Refacciones</p>
            <div className="space-y-2">
              {orden.detalle.map((r: any, i: number) => (
                <div key={i} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {r.refaccion?.nombre ?? '—'}
                    </div>
                    <div className="text-xs text-gray-400">× {r.cantidad}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 ml-3 shrink-0">
                    ${Number(r.precioUnitario * r.cantidad).toLocaleString('es-MX')}
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold text-gray-700 pt-2 border-t border-gray-100">
                <span>Subtotal refacciones</span>
                <span>${totalRefacciones.toLocaleString('es-MX')}</span>
              </div>
            </div>
          </section>
        )}

        {/* Total general */}
        {(totalServicios + totalRefacciones) > 0 && (
          <div className="bg-gray-900 text-white rounded-xl px-5 py-4 flex justify-between items-center">
            <span className="font-semibold">Total estimado</span>
            <span className="text-xl font-bold">
              ${(totalServicios + totalRefacciones).toLocaleString('es-MX')}
            </span>
          </div>
        )}
      </div>

      {/* Barra de acciones fija abajo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 max-w-lg mx-auto flex gap-3">
        {/* Botón asistente IA */}
        <button
          onClick={() => setMostrarIA(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-purple-200 bg-purple-50
                     text-purple-700 text-sm font-semibold hover:bg-purple-100 transition-colors shrink-0"
        >
          🤖 Asistente
        </button>

        {/* Botón cambio de estado */}
        {siguienteEstado ? (
          <button
            disabled={cambiandoEst}
            onClick={handleEstado}
            className={`flex-1 py-3 rounded-xl text-white font-bold text-sm transition-colors
                        disabled:opacity-60 ${
              siguienteEstado === 'LISTO' ? 'bg-green-600 active:bg-green-700' : 'bg-blue-600 active:bg-blue-700'
            }`}
          >
            {cambiandoEst ? 'Actualizando...' : BOTON_LABEL[siguienteEstado]}
          </button>
        ) : (
          <div className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium text-center">
            {ESTADO_LABEL[orden.estado]}
          </div>
        )}
      </div>

      {/* Panel — Asistente IA */}
      {mostrarIA && (
        <AsistenteIA
          orden={orden}
          onCerrar={() => setMostrarIA(false)}
        />
      )}

      {/* Modal — Agregar servicio */}
      {modalServicio && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-w-lg mx-auto p-6 space-y-4 pb-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Agregar servicio</h3>
              <button onClick={() => setModalServicio(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleServicio} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1.5 block font-medium">Servicio *</label>
                <select
                  value={form.servicioId}
                  onChange={e => setForm({ ...form, servicioId: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-3.5 text-sm bg-white"
                  required
                >
                  <option value="">Selecciona un servicio...</option>
                  {servicios.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} — ${Number(s.precioBase ?? 0).toLocaleString('es-MX')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1.5 block font-medium">Cantidad</label>
                <input
                  type="number" min={1}
                  value={form.cantidad}
                  onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-xl p-3.5 text-sm"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1.5 block font-medium">
                  Notas <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  placeholder="Ej: afinación completa, cambio de bujías..."
                  className="w-full border border-gray-300 rounded-xl p-3.5 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalServicio(false)}
                  className="flex-1 border border-gray-300 py-3.5 rounded-xl text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || !form.servicioId}
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl text-sm font-bold
                             disabled:opacity-50 active:bg-blue-700 transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Asistente de diagnóstico IA ────────────────────────────────────────────────
function AsistenteIA({ orden, onCerrar }: { orden: any; onCerrar: () => void }) {
  const [pregunta,   setPregunta]   = useState('')
  const [mensajes,   setMensajes]   = useState<{ rol: 'user' | 'ia'; texto: string }[]>([])
  const [cargando,   setCargando]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Mensaje de bienvenida con contexto precargado
  const contextoPrevio = [
    orden.vehiculo?.marca && `${orden.vehiculo.marca} ${orden.vehiculo.modelo ?? ''} ${orden.vehiculo.anio ?? ''}`.trim(),
    orden.diagnostico && `Falla: "${orden.diagnostico}"`,
  ].filter(Boolean).join(' · ')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviar = async () => {
    if (!pregunta.trim() || cargando) return
    const texto = pregunta.trim()
    setPregunta('')
    setMensajes(prev => [...prev, { rol: 'user', texto }])
    setCargando(true)
    try {
      const { data } = await api.post('/ia/diagnostico', {
        vehiculo:    orden.vehiculo,
        falla:       orden.diagnostico,
        kilometraje: orden.kilometraje,
        pregunta:    texto,
      })
      setMensajes(prev => [...prev, { rol: 'ia', texto: data.respuesta }])
    } catch {
      setMensajes(prev => [...prev, { rol: 'ia', texto: 'Error al consultar el asistente. Verifica tu conexión.' }])
    } finally {
      setCargando(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg mx-auto flex flex-col"
           style={{ maxHeight: '85vh' }}>

        {/* Header del panel */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="font-bold text-gray-800">🤖 Asistente de diagnóstico</div>
            {contextoPrevio && (
              <div className="text-xs text-gray-400 mt-0.5 truncate">{contextoPrevio}</div>
            )}
          </div>
          <button onClick={onCerrar} className="text-gray-400 text-2xl leading-none hover:text-gray-600">×</button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {mensajes.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <div className="text-3xl mb-2">🔧</div>
              <p>Describe la falla o haz una pregunta técnica.</p>
              {orden.diagnostico && (
                <button
                  onClick={() => setPregunta(`¿Cuáles son las causas más probables de: "${orden.diagnostico}"?`)}
                  className="mt-3 text-xs text-purple-600 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50"
                >
                  Analizar falla reportada →
                </button>
              )}
            </div>
          )}

          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.rol === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {m.texto}
              </div>
            </div>
          ))}

          {cargando && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-500">
                <span className="animate-pulse">Analizando...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t flex gap-2">
          <textarea
            value={pregunta}
            onChange={e => setPregunta(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: ¿Qué puede causar golpeteo en el motor en frío?"
            rows={2}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={enviar}
            disabled={!pregunta.trim() || cargando}
            className="bg-purple-600 text-white px-4 rounded-xl font-bold text-sm
                       disabled:opacity-40 hover:bg-purple-700 transition-colors shrink-0"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fila de info ───────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-24 shrink-0">{label}:</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
