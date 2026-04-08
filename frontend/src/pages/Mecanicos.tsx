import { useEffect, useState } from 'react'
import {
  getMecanicos, crearMecanico,
  actualizarMecanico, eliminarMecanico,
  getUsuariosMecanicos
} from '../services/mecanico.service'

interface Mecanico {
  id: string
  nombre: string
  telefono?: string
  especialidad?: string
  activo: boolean
  usuarioId?: string
  usuario?: { id: string; email: string; activo: boolean }
}

interface UsuarioMecanico {
  id: string;
  nombre: string;
  email: string;
}

const formVacio = {
  nombre: '', telefono: '', especialidad: '', usuarioId: ''
}

export default function Mecanicos() {
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioMecanico[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Mecanico | null>(null)
  const [form, setForm] = useState(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmElim, setConfirmElim] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const [m, u] = await Promise.all([
        getMecanicos(),
        getUsuariosMecanicos()
      ])
      setMecanicos(m)
      setUsuarios(u)
    } catch (err) {
      console.error("Error al cargar datos:", err)
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

  const abrirEditar = (m: Mecanico) => {
    setEditando(m)
    setForm({
      nombre: m.nombre,
      telefono: m.telefono ?? '',
      especialidad: m.especialidad ?? '',
      usuarioId: m.usuarioId ?? ''
    })
    setError('')
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const payload = {
        nombre: form.nombre,
        telefono: form.telefono || undefined,
        especialidad: form.especialidad || undefined,
        usuarioId: form.usuarioId || undefined
      }
      if (editando) {
        await actualizarMecanico(editando.id, payload)
      } else {
        await crearMecanico(payload)
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
      await eliminarMecanico(id)
      setConfirmElim(null)
      cargar()
    } catch {
      alert('Error al eliminar')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mecánicos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mecanicos.length} mecánico{mecanicos.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          + Nuevo mecánico
        </button>
      </div>

      {/* Grid de tarjetas */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : mecanicos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">👨‍🔧</div>
          <div className="text-gray-500 font-medium">No hay mecánicos registrados</div>
          <button onClick={abrirCrear} className="mt-4 text-blue-600 text-sm hover:underline">
            Registrar el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mecanicos.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl">
                  👨‍🔧
                </div>
                <div>
                  <div className="font-bold text-gray-800">{m.nombre}</div>
                  {m.especialidad && (
                    <div className="text-xs text-amber-600 font-medium mt-0.5">{m.especialidad}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {m.telefono && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📱</span>
                    <a href={`tel:${m.telefono}`} className="hover:text-blue-600 transition-colors">
                      {m.telefono}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {m.usuario ? (
                    <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                      ✓ Vinculado — {m.usuario.email}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                      Sin usuario del sistema
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => abrirEditar(m)} className="flex-1 text-xs text-gray-600 hover:text-blue-600 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                  Editar
                </button>
                <button onClick={() => setConfirmElim(m.id)} className="flex-1 text-xs text-gray-600 hover:text-red-600 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear / editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editando ? 'Editar mecánico' : 'Nuevo mecánico'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  autoFocus
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Carlos Ramos"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  value={form.telefono}
                  onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                  placeholder="4431234567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                <input
                  value={form.especialidad}
                  onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))}
                  placeholder="Motor, Eléctrico..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vincular usuario</label>
                <select
                  value={form.usuarioId}
                  onChange={e => setForm(f => ({ ...f, usuarioId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin vincular</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} — {u.email}</option>
                  ))}
                </select>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" disabled={guardando} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                  {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear mecánico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmElim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="font-bold text-gray-800">¿Eliminar mecánico?</h3>
              <p className="text-sm text-gray-500 mt-1">El mecánico quedará inactivo pero se conserva el historial.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmElim(null)} className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleEliminar(confirmElim)} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}