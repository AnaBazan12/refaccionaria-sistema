import { useEffect, useState } from 'react'
import { 
  getVehiculos, buscarPorPlaca, crearVehiculo,
  actualizarVehiculo, eliminarVehiculo 
} from '../services/vehiculo.service'
import { getClientes } from '../services/cliente.service'

interface Vehiculo {
  id:           string
  placa:        string
  marca:        string
  modelo:       string
  anio:         number
  color?:       string
  numSerie?:    string
  kilometraje?: number
  notas?:       string
  clienteId:    string
  cliente:      { id: string; nombre: string; telefono?: string }
}

const vehiculoVacio = {
  placa: '', marca: '', modelo: '', anio: new Date().getFullYear().toString(),
  color: '', numSerie: '', kilometraje: '', notas: '', clienteId: ''
}

const MARCAS_COMUNES = [
  'Chevrolet','Ford','Nissan','Toyota','Volkswagen','Honda',
  'Dodge','Jeep','RAM','Kia','Hyundai','Mazda','Seat','Renault','Otro'
]

export default function Vehiculos() {
  const [vehiculos,     setVehiculos]     = useState<Vehiculo[]>([])
  const [clientes,      setClientes]      = useState<any[]>([])
  const [cargando,      setCargando]      = useState(true)
  const [busqueda,      setBusqueda]      = useState('')
  const [buscandoPlaca, setBuscandoPlaca] = useState(false)
  const [modalAbierto,  setModalAbierto]  = useState(false)
  const [editando,      setEditando]      = useState<Vehiculo | null>(null)
  const [form,          setForm]          = useState(vehiculoVacio)
  const [guardando,     setGuardando]     = useState(false)
  const [error,         setError]         = useState('')
  const [confirmElim,   setConfirmElim]   = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    try {
      const [v, c] = await Promise.all([getVehiculos(), getClientes()])
      setVehiculos(v)
      setClientes(c)
    } catch (err) {
      console.error("Error al cargar datos", err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleBuscarPlaca = async () => {
    if (!busqueda.trim()) { cargar(); return }
    setBuscandoPlaca(true)
    try {
      const v = await buscarPorPlaca(busqueda.trim())
      setVehiculos(v ? [v] : [])
    } catch {
      setVehiculos([])
    } finally {
      setBuscandoPlaca(false)
    }
  }

  const vehiculosFiltrados = busqueda && !buscandoPlaca
    ? vehiculos.filter(v =>
        v.marca.toLowerCase().includes(busqueda.toLowerCase())   ||
        v.modelo.toLowerCase().includes(busqueda.toLowerCase())  ||
        v.placa.toLowerCase().includes(busqueda.toLowerCase())   ||
        v.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : vehiculos

  const abrirCrear = () => {
    setEditando(null)
    setForm(vehiculoVacio)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (v: Vehiculo) => {
    setEditando(v)
    setForm({
      placa:       v.placa,
      marca:       v.marca,
      modelo:      v.modelo,
      anio:        v.anio.toString(),
      color:       v.color       ?? '',
      numSerie:    v.numSerie    ?? '',
      kilometraje: v.kilometraje?.toString() ?? '',
      notas:       v.notas       ?? '',
      clienteId:   v.clienteId
    })
    setError('')
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.placa.trim() || !form.marca || !form.modelo || !form.clienteId || !form.anio) {
      setError('Placa, marca, modelo, año y cliente son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const payload = {
        ...form,
        anio:        Number(form.anio),
        kilometraje: form.kilometraje ? Number(form.kilometraje) : undefined
      }
      if (editando) {
        await actualizarVehiculo(editando.id, payload)
      } else {
        await crearVehiculo(payload)
      }
      setModalAbierto(false)
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al guardar el vehículo')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await eliminarVehiculo(id)
      setConfirmElim(null)
      cargar()
    } catch {
      alert('Error al eliminar el vehículo')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {vehiculos.length} registrado{vehiculos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirCrear} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          + Nuevo vehículo
        </button>
      </div>

      {/* Búsqueda */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBuscarPlaca()}
            placeholder="Buscar por marca, modelo, placa o cliente..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button onClick={handleBuscarPlaca} className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors">
          {buscandoPlaca ? '...' : 'Buscar placa'}
        </button>
      </div>

      {/* Grid de Vehículos */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehiculosFiltrados.map(v => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between mb-4">
                <div>
                    <span className="font-bold text-gray-800 block">{v.marca} {v.modelo}</span>
                    <span className="text-xs text-gray-400">{v.anio} • {v.color || 'Sin color'}</span>
                </div>
                <span className="bg-gray-100 self-start font-mono text-xs font-bold px-2 py-1 rounded border border-gray-200">{v.placa}</span>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="text-[10px] uppercase tracking-wider font-bold text-blue-400 mb-1">Propietario</div>
                <div className="text-sm font-medium text-blue-800">{v.cliente?.nombre}</div>
                {v.cliente?.telefono && (
                  <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span>📞</span> {v.cliente.telefono}
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t pt-3">
                <button onClick={() => abrirEditar(v)} className="flex-1 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors">Editar</button>
                <button onClick={() => setConfirmElim(v.id)} className="flex-1 text-xs font-medium text-gray-600 hover:text-red-600 transition-colors">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Formulario */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800">{editando ? 'Editar' : 'Registrar'} Vehículo</h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleGuardar} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg animate-pulse">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Cliente Propietario</label>
                <select 
                  value={form.clienteId} 
                  onChange={e => setForm({...form, clienteId: e.target.value})}
                  className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Placa</label>
                    <input 
                        placeholder="ABC-123" 
                        value={form.placa} 
                        onChange={e => setForm({...form, placa: e.target.value.toUpperCase()})} 
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Marca</label>
                    <select 
                        value={form.marca} 
                        onChange={e => setForm({...form, marca: e.target.value})} 
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500"
                    >
                        <option value="">Seleccionar...</option>
                        {MARCAS_COMUNES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Modelo</label>
                    <input 
                        placeholder="Ej. Corolla" 
                        value={form.modelo} 
                        onChange={e => setForm({...form, modelo: e.target.value})} 
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Año</label>
                    <input 
                        type="number"
                        placeholder="2024" 
                        value={form.anio} 
                        onChange={e => setForm({...form, anio: e.target.value})} 
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" 
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Color</label>
                    <input 
                        placeholder="Gris plata" 
                        value={form.color} 
                        onChange={e => setForm({...form, color: e.target.value})} 
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Kilometraje</label>
                    <input 
                        type="number"
                        placeholder="0" 
                        value={form.kilometraje} 
                        onChange={e => setForm({...form, kilometraje: e.target.value})} 
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" 
                    />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Número de Serie (VIN)</label>
                <input 
                    placeholder="Número de chasis" 
                    value={form.numSerie} 
                    onChange={e => setForm({...form, numSerie: e.target.value})} 
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Notas / Observaciones</label>
                <textarea 
                    placeholder="Detalles sobre el estado del vehículo..." 
                    value={form.notas} 
                    onChange={e => setForm({...form, notas: e.target.value})} 
                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 min-h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                    type="button" 
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={guardando}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 disabled:bg-blue-400 transition-all"
                >
                    {guardando ? 'Guardando...' : 'Guardar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {confirmElim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60">
          <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Estás seguro?</h3>
            <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer. Se eliminarán los datos del vehículo permanentemente.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmElim(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                No, cancelar
              </button>
              <button 
                onClick={() => handleEliminar(confirmElim)} 
                className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-100 transition-all"
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