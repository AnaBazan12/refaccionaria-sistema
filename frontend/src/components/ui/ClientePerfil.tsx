import { useEffect, useState } from 'react'
import api from '../../services/api'
import { abrirPDF } from '../../utils/pdf'

/* ─── tipos ──────────────────────────────────────────────────── */
interface Vehiculo {
  id: string
  placa: string
  marca: string
  modelo: string
  anio?: number
  color?: string
}

interface OrdenHistorial {
  id: string
  numero?: number
  estado: string
  total: number
  totalManoObra: number
  totalRefacciones: number
  saldoPendiente: number
  pagado: boolean
  kilometraje?: number
  diagnostico?: string
  createdAt: string
  fechaEntrega?: string
  mecanico?: { nombre: string }
  servicios: { servicio: { nombre: string }; subtotal: number }[]
}

interface HistorialVehiculo {
  vehiculo: {
    placa: string; marca: string; modelo: string
    anio?: number; cliente: string; telefono?: string
  }
  estadisticas: { totalVisitas: number; totalGastado: string }
  historial: OrdenHistorial[]
}

/* ─── helpers ─────────────────────────────────────────────────── */
const fmt = (n: any) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const estadoColor: Record<string, string> = {
  RECIBIDO:            'bg-blue-100 text-blue-700',
  EN_PROCESO:          'bg-yellow-100 text-yellow-700',
  EN_ESPERA_REFACCION: 'bg-orange-100 text-orange-700',
  LISTO:               'bg-green-100 text-green-700',
  ENTREGADO:           'bg-gray-100 text-gray-600',
  CANCELADO:           'bg-red-100 text-red-600',
}
const estadoLabel: Record<string, string> = {
  RECIBIDO:            'Recibido',
  EN_PROCESO:          'En proceso',
  EN_ESPERA_REFACCION: 'Espera refacción',
  LISTO:               'Listo',
  ENTREGADO:           'Entregado',
  CANCELADO:           'Cancelado',
}

/* ─── tarjeta de vehículo ─────────────────────────────────────── */
function TarjetaVehiculo({
  vehiculo,
  seleccionado,
  onSeleccionar,
}: {
  vehiculo: Vehiculo
  seleccionado: boolean
  onSeleccionar: () => void
}) {
  return (
    <button
      onClick={onSeleccionar}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        seleccionado
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚗</span>
        <div>
          <div className="font-semibold text-gray-800">
            {vehiculo.marca} {vehiculo.modelo}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              {vehiculo.placa}
            </span>
            {vehiculo.anio && (
              <span className="text-xs text-gray-400">{vehiculo.anio}</span>
            )}
            {vehiculo.color && (
              <span className="text-xs text-gray-400">· {vehiculo.color}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

/* ─── historial de un vehículo ────────────────────────────────── */
function HistorialPanel({ vehiculoId }: { vehiculoId: string }) {
  const [datos, setDatos] = useState<HistorialVehiculo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [expandida, setExpandida] = useState<string | null>(null)

  useEffect(() => {
    setCargando(true)
    api
      .get(`/reportes/historial/${vehiculoId}`)
      .then(r => setDatos(r.data))
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [vehiculoId])

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!datos) return null

  const { estadisticas, historial } = datos

  return (
    <div className="space-y-4">
      {/* resumen estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{estadisticas.totalVisitas}</div>
          <div className="text-xs text-blue-500 mt-0.5">Visitas al taller</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-green-700">{fmt(estadisticas.totalGastado)}</div>
          <div className="text-xs text-green-500 mt-0.5">Total invertido</div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {historial.filter(o => o.estado === 'ENTREGADO').length}
          </div>
          <div className="text-xs text-purple-500 mt-0.5">Servicios completados</div>
        </div>
      </div>

      {/* lista de órdenes */}
      {historial.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">🔧</div>
          <p className="text-sm">Sin servicios registrados para este vehículo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {historial.map((o) => {
            const abierta = expandida === o.id
            return (
              <div
                key={o.id}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* fila principal — clic para expandir */}
                <button
                  onClick={() => setExpandida(abierta ? null : o.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-300 text-xs">{abierta ? '▼' : '▶'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400 font-bold">
                          #{o.numero ?? o.id.slice(0, 6)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[o.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                          {estadoLabel[o.estado] ?? o.estado}
                        </span>
                        {o.pagado ? (
                          <span className="text-xs text-green-600 font-medium">✓ Pagado</span>
                        ) : Number(o.saldoPendiente) > 0 ? (
                          <span className="text-xs text-red-500 font-medium">
                            Debe {fmt(o.saldoPendiente)}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                        {o.mecanico && ` · ${o.mecanico.nombre}`}
                        {o.kilometraje && ` · ${o.kilometraje.toLocaleString('es-MX')} km`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">{fmt(o.total)}</div>
                    <div className="text-xs text-gray-400">
                      {o.servicios.length} servicio{o.servicios.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>

                {/* detalle expandido */}
                {abierta && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                    {/* diagnóstico */}
                    {o.diagnostico && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700 mb-0.5">Diagnóstico / Falla reportada</p>
                        <p className="text-sm text-gray-700">{o.diagnostico}</p>
                      </div>
                    )}

                    {/* servicios */}
                    {o.servicios.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Servicios realizados</p>
                        <div className="space-y-1">
                          {o.servicios.map((s, i) => (
                            <div key={i} className="flex justify-between text-sm bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                              <span className="text-gray-700">{s.servicio.nombre}</span>
                              <span className="font-medium text-gray-600">{fmt(s.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* totales + acciones */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Mano de obra: <strong>{fmt(o.totalManoObra)}</strong></span>
                        <span>Refacciones: <strong>{fmt(o.totalRefacciones)}</strong></span>
                      </div>
                      <button
                        onClick={() =>
                          abrirPDF(`/pdf/orden/${o.id}`, `orden-${o.numero ?? o.id.slice(0, 6)}.pdf`)
                        }
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        📄 PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── modal principal ─────────────────────────────────────────── */
export default function ClientePerfil({
  cliente,
  onCerrar,
}: {
  cliente: { id: string; nombre: string; telefono?: string; email?: string; direccion?: string }
  onCerrar: () => void
}) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [cargando, setCargando] = useState(true)
  const [vehiculoActivo, setVehiculoActivo] = useState<string | null>(null)

  useEffect(() => {
    api
      .get(`/vehiculos/cliente/${cliente.id}`)
      .then(r => {
        const lista: Vehiculo[] = Array.isArray(r.data) ? r.data : (r.data?.data ?? [])
        setVehiculos(lista)
        if (lista.length > 0) setVehiculoActivo(lista[0].id)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [cliente.id])

  const telLimpio = cliente.telefono?.replace(/\D/g, '') ?? ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
              {cliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{cliente.nombre}</h2>
              <div className="flex items-center gap-3 mt-1">
                {cliente.telefono && (
                  <a
                    href={`tel:${cliente.telefono}`}
                    className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                  >
                    📞 {cliente.telefono}
                  </a>
                )}
                {telLimpio && (
                  <a
                    href={`https://wa.me/52${telLimpio}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-green-600 hover:underline flex items-center gap-1"
                  >
                    💬 WhatsApp
                  </a>
                )}
                {cliente.email && (
                  <span className="text-sm text-gray-400">{cliente.email}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* panel izquierdo: vehículos */}
          <div className="w-56 flex-shrink-0 border-r border-gray-100 p-4 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Vehículos
            </p>
            {cargando ? (
              <div className="text-center text-gray-300 py-8">Cargando…</div>
            ) : vehiculos.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                <div className="text-3xl mb-2">🚗</div>
                Sin autos registrados
              </div>
            ) : (
              <div className="space-y-2">
                {vehiculos.map(v => (
                  <TarjetaVehiculo
                    key={v.id}
                    vehiculo={v}
                    seleccionado={vehiculoActivo === v.id}
                    onSeleccionar={() => setVehiculoActivo(v.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* panel derecho: historial */}
          <div className="flex-1 overflow-y-auto p-5">
            {!vehiculoActivo ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <span className="text-5xl mb-3">🔧</span>
                <p className="text-sm">Selecciona un vehículo para ver su historial</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  {vehiculos.filter(v => v.id === vehiculoActivo).map(v => (
                    <div key={v.id}>
                      <h3 className="font-bold text-gray-800 text-lg">
                        {v.marca} {v.modelo}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Placa <span className="font-mono font-bold">{v.placa}</span>
                        {v.anio && ` · ${v.anio}`}
                        {v.color && ` · ${v.color}`}
                      </p>
                    </div>
                  ))}
                </div>
                <HistorialPanel vehiculoId={vehiculoActivo} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
