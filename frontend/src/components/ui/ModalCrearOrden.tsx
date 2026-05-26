import { useEffect, useState } from 'react'
import {
  getClientes, getVehiculosPorCliente,
  getMecanicos, getServicios, crearOrden
} from '../../services/orden.service'

interface Props {
  onCerrar:  () => void
  onCreada:  () => void
}

export default function ModalCrearOrden({ onCerrar, onCreada }: Props) {
  const [clientes,   setClientes]   = useState<any[]>([])
  const [vehiculos,  setVehiculos]  = useState<any[]>([])
  const [mecanicos,  setMecanicos]  = useState<any[]>([])
  const [servicios,  setServicios]  = useState<any[]>([])

  const [clienteId,    setClienteId]    = useState('')
  const [vehiculoId,   setVehiculoId]   = useState('')
  const [mecanicoId,   setMecanicoId]   = useState('')
  const [kilometraje,  setKilometraje]  = useState('')
  const [diagnostico,  setDiagnostico]  = useState('')
  const [observaciones,setObservaciones]= useState('')

  // Servicios seleccionados para la orden
  const [serviciosOrden, setServiciosOrden] = useState<any[]>([])
  const [servicioSel,    setServicioSel]    = useState('')
  const [cantidad,       setCantidad]       = useState(1)
  const [precio,         setPrecio]         = useState('')

  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')
  // Paso 2: pantalla de éxito tras crear
  const [ordenCreada, setOrdenCreada] = useState<{ numero: number; whatsapp: { url: string } | null } | null>(null)

  useEffect(() => {
    Promise.all([getClientes(), getMecanicos(), getServicios()])
      .then(([c, m, s]) => {
        setClientes(c)
        setMecanicos(m)
        setServicios(s)
      })
  }, [])

  // Cuando cambia el cliente, cargar sus vehículos
  useEffect(() => {
  if (!clienteId) { 
    setVehiculos([]); 
    setVehiculoId(''); // Resetear ID si no hay cliente
    return; 
  }

  // Opcional: podrías poner un estado de "cargandoVehiculos" aquí
  getVehiculosPorCliente(clienteId)
    .then(data => {
      setVehiculos(data);
      // Importante: Si el cliente solo tiene 1 vehículo, seleccionarlo automáticamente
      if (data.length === 1) {
        setVehiculoId(data[0].id);
      }
    })
    .catch(err => {
      console.error("Error al traer vehículos:", err);
      setVehiculos([]);
    });
}, [clienteId]);
  const agregarServicio = () => {
    if (!servicioSel || !precio) return
    const serv = servicios.find(s => s.id === servicioSel)
    setServiciosOrden(prev => [...prev, {
      servicioId:     servicioSel,
      nombre:         serv?.nombre,
      cantidad,
      precioUnitario: Number(precio),
      subtotal:       cantidad * Number(precio)
    }])
    setServicioSel('')
    setCantidad(1)
    setPrecio('')
  }

  const quitarServicio = (idx: number) => {
    setServiciosOrden(prev => prev.filter((_, i) => i !== idx))
  }

  const totalOrden = serviciosOrden.reduce((s, sv) => s + sv.subtotal, 0)

  const handleGuardar = async () => {
    if (!clienteId || !vehiculoId) {
      setError('Cliente y vehículo son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const res = await crearOrden({
        clienteId, vehiculoId,
        mecanicoId: mecanicoId || undefined,
        kilometraje: kilometraje ? Number(kilometraje) : undefined,
        diagnostico, observaciones,
        servicios: serviciosOrden
      })
      // Notificar al padre para que recargue la lista
      onCreada()
      // Mostrar pantalla de éxito (con o sin WhatsApp)
      setOrdenCreada({ numero: res.orden?.numero, whatsapp: res.whatsapp ?? null })
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al crear la orden')
    } finally {
      setGuardando(false)
    }
  }

  // ── Pantalla de éxito ───────────────────────────────────────
  if (ordenCreada) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            Orden #{ordenCreada.numero} creada
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            La orden quedó registrada con estado <span className="font-semibold text-blue-600">Recibido</span>.
          </p>

          {ordenCreada.whatsapp ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                ¿Avisamos al cliente que ya recibimos su vehículo?
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href={ordenCreada.whatsapp.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onCerrar}
                  className="flex items-center justify-center gap-2 bg-green-500
                             hover:bg-green-600 text-white font-semibold py-3
                             rounded-xl transition-colors text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.103 1.504 5.818L.057 23.885a.5.5 0 00.659.61l6.249-1.99A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.504-5.173-1.378l-.361-.212-3.743 1.19 1.257-3.631-.229-.373A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  📱 Avisar por WhatsApp
                </a>
                <button
                  onClick={onCerrar}
                  className="py-2.5 text-sm text-gray-500 hover:text-gray-700
                             border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Omitir
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onCerrar}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white
                         font-semibold rounded-xl transition-colors text-sm"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">Nueva orden de trabajo</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <select
                value={clienteId}
                onChange={e => { setClienteId(e.target.value); setVehiculoId('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Vehículo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehículo *
              </label>
              <select
                value={vehiculoId}
                onChange={e => setVehiculoId(e.target.value)}
                disabled={!clienteId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                           disabled:bg-gray-100"
              >
                <option value="">
                  {clienteId ? 'Seleccionar vehículo' : 'Primero elige cliente'}
                </option>
                {vehiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} — {v.placa}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mecánico y Kilometraje */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mecánico asignado
              </label>
              <select
                value={mecanicoId}
                onChange={e => setMecanicoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin asignar</option>
                {mecanicos.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilometraje actual
              </label>
              <input
                type="number"
                value={kilometraje}
                onChange={e => setKilometraje(e.target.value)}
                placeholder="52000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Diagnóstico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnóstico / Falla reportada
            </label>
            <textarea
              value={diagnostico}
              onChange={e => setDiagnostico(e.target.value)}
              rows={2}
              placeholder="Cliente reporta ruido en frenos delanteros..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Golpe en puerta trasera, no incluido en servicio..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Agregar servicios */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Servicios</h3>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={servicioSel}
                onChange={e => {
                  setServicioSel(e.target.value)
                  const s = servicios.find(sv => sv.id === e.target.value)
                  if (s) setPrecio(s.precioBase)
                }}
                className="col-span-1 border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar servicio</option>
                {servicios.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>

              <input
                type="number"
                value={cantidad}
                min={1}
                onChange={e => setCantidad(Number(e.target.value))}
                placeholder="Cant."
                className="border border-gray-300 rounded-lg px-3 py-2
                           text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-2">
                <input
                  type="number"
                  value={precio}
                  onChange={e => setPrecio(e.target.value)}
                  placeholder="Precio"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={agregarServicio}
                  className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 text-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Lista de servicios agregados */}
            {serviciosOrden.length > 0 && (
              <div className="space-y-2 mt-2">
                {serviciosOrden.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50
                               rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-gray-700">
                      {s.nombre} × {s.cantidad}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">
                        ${s.subtotal.toLocaleString('es-MX')}
                      </span>
                      <button
                        onClick={() => quitarServicio(idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold
                                text-gray-800 pt-2 border-t border-gray-200">
                  <span>Total mano de obra</span>
                  <span>${totalOrden.toLocaleString('es-MX')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700
                            text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium
                       rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {guardando ? 'Guardando...' : 'Crear orden'}
          </button>
        </div>
      </div>
    </div>
  )
}