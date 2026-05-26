import { useEffect, useState } from 'react'
import { useParams }           from 'react-router-dom'
import api                     from '../services/api'

// ── Tipos ──────────────────────────────────────────────────────
interface Orden {
  numero:        number
  estado:        string
  estadoPago:    string
  fechaIngreso:  string
  fechaEntrega:  string | null
  kilometraje:   number | null
  diagnostico:   string | null
  observaciones: string | null
  total:         number
  mecanico:      string | null
  servicios:     string[]
}

interface Vehiculo {
  placa:   string
  marca:   string
  modelo:  string
  anio:    number | null
  color:   string | null
  cliente: string
}

interface Negocio {
  nombre:    string
  subtitulo: string
  telefono:  string
  direccion: string
  ciudad:    string
  logo:      string | null
}

interface HistorialData {
  vehiculo: Vehiculo
  ordenes:  Orden[]
  negocio:  Negocio
}

// ── Helpers ────────────────────────────────────────────────────
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

const fmtMonto = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

const ESTADO_COLOR: Record<string, string> = {
  RECIBIDO:        'bg-blue-100 text-blue-700',
  EN_PROCESO:      'bg-amber-100 text-amber-700',
  ESPERA_REFACCION:'bg-orange-100 text-orange-700',
  LISTO:           'bg-green-100 text-green-700',
  ENTREGADO:       'bg-gray-100 text-gray-600',
  CANCELADO:       'bg-red-100 text-red-600',
}

const ESTADO_LABEL: Record<string, string> = {
  RECIBIDO:        'Recibido',
  EN_PROCESO:      'En proceso',
  ESPERA_REFACCION:'Espera refacción',
  LISTO:           'Listo',
  ENTREGADO:       'Entregado',
  CANCELADO:       'Cancelado',
}

// ── Componente principal ───────────────────────────────────────
export default function HistorialVehiculo() {
  const { placa }                = useParams<{ placa: string }>()
  const [data,    setData]       = useState<HistorialData | null>(null)
  const [cargando,setCargando]   = useState(true)
  const [error,   setError]      = useState('')

  useEffect(() => {
    if (!placa) return
    api.get(`/historial/${placa.toUpperCase()}`)
      .then(r => setData(r.data))
      .catch(e => {
        if (e.response?.status === 404) setError('Vehículo no encontrado')
        else setError('Error al cargar historial')
      })
      .finally(() => setCargando(false))
  }, [placa])

  // ── Cargando ─────────────────────────────────────────────────
  if (cargando) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm">Cargando historial…</p>
      </div>
    </div>
  )

  // ── Error ─────────────────────────────────────────────────────
  if (error || !data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-6xl">🚗</div>
        <h1 className="text-xl font-bold text-slate-700">
          {error || 'Historial no disponible'}
        </h1>
        <p className="text-slate-500 text-sm">
          Verifica que la placa sea correcta o consulta directamente en el taller.
        </p>
      </div>
    </div>
  )

  const { vehiculo, ordenes, negocio } = data

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header del taller ─────────────────────────────── */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-lg mx-auto px-5 py-5 flex items-center gap-4">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-blue-600 shrink-0
                          flex items-center justify-center font-black text-2xl">
            {negocio.logo ? (
              <img
                src={`data:image/png;base64,${negocio.logo}`}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <span>{negocio.nombre.charAt(0)}</span>
            )}
          </div>
          {/* Info */}
          <div>
            <h1 className="font-bold text-lg leading-tight">{negocio.nombre}</h1>
            {negocio.subtitulo && (
              <p className="text-slate-400 text-xs mt-0.5">{negocio.subtitulo}</p>
            )}
            {negocio.telefono && (
              <a
                href={`tel:${negocio.telefono}`}
                className="text-blue-400 text-xs mt-1 flex items-center gap-1"
              >
                📞 {negocio.telefono}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── Info del vehículo ────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-start gap-4">
            <div className="text-4xl shrink-0">🚗</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-800">
                  {vehiculo.marca} {vehiculo.modelo}
                </h2>
                {vehiculo.anio && (
                  <span className="text-sm text-slate-500 font-medium">{vehiculo.anio}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="bg-slate-100 text-slate-700 text-xs font-mono font-bold
                                 px-3 py-1 rounded-full tracking-wider">
                  {vehiculo.placa}
                </span>
                {vehiculo.color && (
                  <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
                    {vehiculo.color}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Propietario: <span className="font-medium text-slate-700">{vehiculo.cliente}</span>
              </p>
            </div>
          </div>

          {/* Resumen */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-blue-700">{ordenes.length}</div>
              <div className="text-xs text-blue-500 font-medium">
                visita{ordenes.length !== 1 ? 's' : ''} al taller
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-green-700">
                {ordenes.filter(o => o.estado === 'ENTREGADO').length}
              </div>
              <div className="text-xs text-green-500 font-medium">servicios completados</div>
            </div>
          </div>
        </div>

        {/* ── Timeline de órdenes ──────────────────────────── */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-3">
            Historial de servicios
          </h3>

          {ordenes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">Sin órdenes registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ordenes.map((orden, idx) => (
                <div
                  key={orden.numero}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  {/* Header orden */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs font-mono">#{orden.numero}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ESTADO_COLOR[orden.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ESTADO_LABEL[orden.estado] ?? orden.estado}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{fmtFecha(orden.fechaIngreso)}</span>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4 space-y-3">
                    {/* Servicios */}
                    {orden.servicios.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {orden.servicios.map((s, i) => (
                          <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-lg font-medium">
                            🔧 {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Diagnóstico */}
                    {orden.diagnostico && (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        <span className="font-medium text-slate-700">Diagnóstico: </span>
                        {orden.diagnostico}
                      </p>
                    )}

                    {/* Kilometraje + mecánico */}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {orden.kilometraje && (
                        <span>🛣 {orden.kilometraje.toLocaleString('es-MX')} km</span>
                      )}
                      {orden.mecanico && (
                        <span>👨‍🔧 {orden.mecanico}</span>
                      )}
                      {orden.fechaEntrega && (
                        <span>✅ {fmtFecha(orden.fechaEntrega)}</span>
                      )}
                    </div>

                    {/* Total */}
                    {orden.total > 0 && (
                      <div className="flex justify-end">
                        <span className="text-sm font-bold text-slate-700">
                          {fmtMonto(orden.total)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="text-center pb-8 pt-2 space-y-1">
          <p className="text-xs text-slate-400">{negocio.nombre}</p>
          {(negocio.direccion || negocio.ciudad) && (
            <p className="text-xs text-slate-400">
              {[negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')}
            </p>
          )}
          {negocio.telefono && (
            <a href={`tel:${negocio.telefono}`} className="text-xs text-blue-500 block">
              {negocio.telefono}
            </a>
          )}
          <p className="text-xs text-slate-300 pt-2">Historial generado automáticamente</p>
        </div>
      </div>
    </div>
  )
}
