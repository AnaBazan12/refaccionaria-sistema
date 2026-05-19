import { useEffect, useState } from 'react'
import api from '../services/api'

interface Servicio {
  id:          string
  nombre:      string
  descripcion: string | null
  precioBase:  string | number
  activo:      boolean
  createdAt:   string
}

const vacioForm = { nombre: '', descripcion: '', precioBase: '' }

export default function Servicios() {
  const [servicios,  setServicios]  = useState<Servicio[]>([])
  const [cargando,   setCargando]   = useState(true)
  const [busqueda,   setBusqueda]   = useState('')
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState<Servicio | null>(null)
  const [form,       setForm]       = useState(vacioForm)
  const [guardando,  setGuardando]  = useState(false)
  const [error,      setError]      = useState('')

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/servicios')
      setServicios(Array.isArray(data) ? data : (data.data ?? []))
    } catch {
      setError('Error al cargar servicios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setForm(vacioForm)
    setError('')
    setModal(true)
  }

  const abrirEditar = (s: Servicio) => {
    setEditando(s)
    setForm({
      nombre:      s.nombre,
      descripcion: s.descripcion ?? '',
      precioBase:  String(s.precioBase),
    })
    setError('')
    setModal(true)
  }

  const cerrar = () => {
    setModal(false)
    setEditando(null)
    setForm(vacioForm)
    setError('')
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.precioBase || Number(form.precioBase) < 0) { setError('El precio base es obligatorio'); return }

    setGuardando(true)
    setError('')
    try {
      const body = {
        nombre:      form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        precioBase:  Number(form.precioBase),
      }
      if (editando) {
        await api.put(`/servicios/${editando.id}`, body)
      } else {
        await api.post('/servicios', body)
      }
      cerrar()
      await cargar()
    } catch (err: any) {
      const msg = err.response?.data?.mensaje ?? err.response?.data?.errores?.[0]?.mensaje
      setError(msg || 'Error al guardar el servicio')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (s: Servicio) => {
    if (!confirm(`¿Eliminar el servicio "${s.nombre}"? No podrá usarse en nuevas órdenes.`)) return
    try {
      await api.delete(`/servicios/${s.id}`)
      await cargar()
    } catch {
      alert('Error al eliminar el servicio')
    }
  }

  const filtrados = servicios.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.descripcion ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Servicios</h1>
          <p className="text-sm text-gray-500 mt-1">
            {servicios.length} {servicios.length === 1 ? 'servicio registrado' : 'servicios registrados'}
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
                     px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-100"
        >
          + Nuevo servicio
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
        <span className="text-gray-400">🔍</span>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o descripción..."
          className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        )}
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando servicios...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-2">🔧</div>
          <p className="text-gray-500 font-medium">
            {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay servicios registrados'}
          </p>
          {!busqueda && (
            <button
              onClick={abrirNuevo}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Agregar el primer servicio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(s => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200
                         hover:shadow-sm transition-all flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">{s.nombre}</h3>
                  {s.descripcion && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{s.descripcion}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => abrirEditar(s)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600
                               hover:bg-gray-50 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(s)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-red-100 text-red-500
                               hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">Precio base</span>
                <span className="text-lg font-black text-blue-600">
                  ${Number(s.precioBase).toLocaleString('es-MX')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editando ? 'Editar servicio' : 'Nuevo servicio'}
              </h2>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del servicio *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Cambio de aceite, Alineación, Frenos..."
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Describe en qué consiste el servicio..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio base *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={form.precioBase}
                    onChange={e => setForm({ ...form, precioBase: e.target.value })}
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Se usa como referencia al agregar el servicio a una orden o cotización.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrar}
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
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
