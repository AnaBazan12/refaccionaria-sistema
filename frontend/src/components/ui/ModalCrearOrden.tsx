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
      await crearOrden({
        clienteId, vehiculoId,
        mecanicoId: mecanicoId || undefined,
        kilometraje: kilometraje ? Number(kilometraje) : undefined,
        diagnostico, observaciones,
        servicios: serviciosOrden
      })
      onCreada()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al crear la orden')
    } finally {
      setGuardando(false)
    }
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