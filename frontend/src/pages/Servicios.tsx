import { useEffect, useState } from 'react'
import api from '../services/api'

interface Servicio {
  id:          string
  nombre:      string
  descripcion?: string
  precioBase:  number
  tipo?:       string
}

const formVacio = { nombre: '', descripcion: '', precioBase: '', tipo: '' }

export default function Servicios() {
  const [servicios,    setServicios]    = useState<Servicio[]>([])
  const [cargando,     setCargando]     = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando,     setEditando]     = useState<Servicio | null>(null)
  const [form,         setForm]         = useState(formVacio)
  const [guardando,    setGuardando]    = useState(false)
  const [error,        setError]        = useState('')
  const [confirmElim,  setConfirmElim]  = useState<string | null>(null)
  const [busqueda,     setBusqueda]     = useState('')

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/servicios')
      setServicios(Array.isArray(data) ? data : (data.data ?? []))
    } catch (err) {
      console.error('Error al cargar servicios', err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const abrirCrear = () => {
    setEditando(null)
    setForm(formVacio)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (s: Servicio) => {
    setEditando(s)
    setForm({
      nombre:      s.nombre,
      descripcion: s.descripcion ?? '',
      precioBase:  s.precioBase.toString(),
      tipo:        s.tipo ?? '',
    })
    setError('')
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.precioBase) {
      setError('Nombre y precio son obligatorios')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const payload = {
        nombre:      form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        precioBase:  Number(form.precioBase),
        tipo:        form.tipo.trim() || undefined,
      }
      if (editando) {
        await api.put(`/servicios/${editando.id}`, payload)
      } else {
        await api.post('/servicios', payload)
      }
      setModalAbierto(false)
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await api.delete(`/servicios/${id}`)
      setConfirmElim(null)
      cargar()
    } catch {
      alert('No se puede eliminar este servicio (puede estar en uso)')
    }
  }

  const lista = servicios.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.tipo ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catálogo de servicios</h1>
          <p className="text-sm text-gray-500 mt-1">
            {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm
                     font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          + Nuevo servicio
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o tipo..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg
                     text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔧</div>
          <div className="text-gray-500 font-medium">
            {busqueda ? 'Sin resultados' : 'No hay servicios registrados'}
          </div>
          {!busqueda && (
            <button
              onClick={abrirCrear}
              className="mt-4 text-blue-600 hover:underline text-sm"
            >
              Agregar el primer servicio
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-xs font-medium text-gray-500">Servicio</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500">Tipo</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500">Precio base</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-800">{s.nombre}</div>
                    {s.descripcion && (
                      <div className="text-xs text-gray-400 mt-0.5">{s.descripcion}</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {s.tipo ? (
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {s.tipo}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-800">
                    ${Number(s.precioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button
                      onClick={() => abrirEditar(s)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmElim(s.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editando ? 'Editar servicio' : 'Nuevo servicio'}
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del servicio *
                </label>
                <input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Cambio de aceite"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo / Categoría
                </label>
                <input
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                  placeholder="Ej: Afinación, Frenos, Suspensión..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio base (mano de obra) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precioBase}
                    onChange={e => setForm({ ...form, precioBase: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5
                               text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción opcional..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium
                             rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmElim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full">
            <p className="text-gray-800 font-medium">¿Eliminar este servicio?</p>
            <p className="text-sm text-gray-500 mt-1">
              Si está siendo usado en órdenes activas no se podrá eliminar.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmElim(null)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEliminar(confirmElim)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
