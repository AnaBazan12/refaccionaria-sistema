import { useEffect, useState } from 'react'
import {
  getClientes, crearCliente,
  actualizarCliente, eliminarCliente
} from '../services/cliente.service'

interface Cliente {
  id: string
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  _count?: { vehiculos: number; ordenes: number }
}

const clienteVacio = {
  nombre: '', telefono: '', email: '', direccion: ''
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState(clienteVacio)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmElim, setConfirmElim] = useState<string | null>(null)

  const cargar = async (q?: string) => {
    setCargando(true)
    try {
      setClientes(await getClientes(q))
    } catch (err) {
      console.error("Error al cargar clientes", err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const timer = setTimeout(() => cargar(busqueda || undefined), 350)
    return () => clearTimeout(timer)
  }, [busqueda])

  const abrirCrear = () => {
    setEditando(null)
    setForm(clienteVacio)
    setError('')
    setModalAbierto(true)
  }

  const abrirEditar = (cliente: Cliente) => {
    setEditando(cliente)
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      direccion: cliente.direccion ?? ''
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
      if (editando) {
        await actualizarCliente(editando.id, form)
      } else {
        await crearCliente(form)
      }
      setModalAbierto(false)
      cargar(busqueda || undefined)
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await eliminarCliente(id)
      setConfirmElim(null)
      cargar(busqueda || undefined)
    } catch {
      alert('Error al eliminar el cliente')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Teléfono</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Autos</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map(cliente => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-800">{cliente.nombre}</div>
                    <div className="text-xs text-gray-400">{cliente.direccion}</div>
                  </td>
                  <td className="px-5 py-3">
                    {cliente.telefono ? (
                      <a href={`tel:${cliente.telefono}`} className="text-blue-600 hover:underline">
                        {cliente.telefono}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{cliente.email ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {cliente._count?.vehiculos ?? 0} autos
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => abrirEditar(cliente)} className="text-blue-600 mr-3">Editar</button>
                    <button onClick={() => setConfirmElim(cliente.id)} className="text-red-600">Eliminar</button>
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{editando ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <form onSubmit={handleGuardar} className="space-y-4">
              <input
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre completo"
                className="w-full border p-2 rounded"
              />
              <input
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                placeholder="Teléfono"
                className="w-full border p-2 rounded"
              />
              <input
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="w-full border p-2 rounded"
              />
              <input
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
                placeholder="Dirección"
                className="w-full border p-2 rounded"
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-blue-600 text-white px-4 py-2 rounded">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {confirmElim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-sm">
            <p>¿Estás seguro de que deseas eliminar este cliente?</p>
            <div className="flex gap-4 mt-4">
              <button onClick={() => setConfirmElim(null)} className="flex-1 border p-2 rounded">Cancelar</button>
              <button onClick={() => handleEliminar(confirmElim)} className="flex-1 bg-red-600 text-white p-2 rounded">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}