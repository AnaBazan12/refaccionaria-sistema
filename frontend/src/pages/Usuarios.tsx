import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getUsuarios, crearUsuario, toggleUsuario, editarUsuario } from '../services/usuario.service'
import { Navigate } from 'react-router-dom'

const ROLES = ['ADMIN', 'RECEPCIONISTA', 'MECANICO']

const colorRol: Record<string, string> = {
  ADMIN:         'bg-purple-100 text-purple-700',
  RECEPCIONISTA: 'bg-blue-100   text-blue-700',
  MECANICO:      'bg-amber-100  text-amber-700',
}

export default function Usuarios() {
  const { usuario } = useAuth()
  const [usuarios,   setUsuarios]  = useState<any[]>([])
  const [cargando,   setCargando]  = useState(true)
  const [modalOpen,  setModalOpen] = useState(false)
  const [editOpen,   setEditOpen]  = useState(false)
  const [editando,   setEditando]  = useState<any>(null)

  // Form nuevo usuario
  const [nombre,    setNombre]    = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [rol,       setRol]       = useState('RECEPCIONISTA')
  const [error,     setError]     = useState('')
  const [guardando, setGuardando] = useState(false)

  // Form edición
  const [eNombre,   setENombre]   = useState('')
  const [eEmail,    setEEmail]    = useState('')
  const [eRol,      setERol]      = useState('RECEPCIONISTA')
  const [ePassword, setEPassword] = useState('')
  const [eError,    setEError]    = useState('')
  const [eGuardando,setEGuardando]= useState(false)

  if (usuario?.rol !== 'ADMIN') return <Navigate to="/dashboard" replace />

  const cargar = async () => {
    setCargando(true)
    try { setUsuarios(await getUsuarios()) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await crearUsuario({ nombre, email, password, rol })
      setModalOpen(false)
      setNombre(''); setEmail(''); setPassword(''); setRol('RECEPCIONISTA')
      cargar()
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al crear usuario')
    } finally { setGuardando(false) }
  }

  const abrirEditar = (u: any) => {
    setEditando(u)
    setENombre(u.nombre)
    setEEmail(u.email)
    setERol(u.rol)
    setEPassword('')
    setEError('')
    setEditOpen(true)
  }

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEError('')
    setEGuardando(true)
    try {
      const campos: any = { nombre: eNombre, email: eEmail, rol: eRol }
      if (ePassword) campos.nuevaPassword = ePassword
      await editarUsuario(editando.id, campos)
      setEditOpen(false)
      cargar()
    } catch (err: any) {
      setEError(err.response?.data?.mensaje || 'Error al actualizar usuario')
    } finally { setEGuardando(false) }
  }

  const handleToggle = async (id: string, activo: boolean) => {
    await toggleUsuario(id, !activo)
    cargar()
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Usuarios del sistema</h1>
          <p className="text-sm text-gray-500 mt-1">Solo visible para administradores</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm
                     font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {cargando ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Rol</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{u.nombre}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorRol[u.rol]}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {/* Editar — todos excepto el propio admin */}
                      <button
                        onClick={() => abrirEditar(u)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium
                                   bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        ✏️ Editar
                      </button>

                      {/* Activar/Desactivar — no al propio usuario */}
                      {u.id !== usuario?.id && (
                        <button
                          onClick={() => handleToggle(u.id, u.activo)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                            ${u.activo
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal nuevo usuario ───────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">Nuevo usuario</h2>
              <button onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleCrear} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  required placeholder="Juan Pérez"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="juan@taller.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={rol} onChange={e => setRol(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700
                                text-sm rounded-lg px-4 py-2.5">{error}</div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" disabled={guardando}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium
                             rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                  {guardando ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal editar usuario ──────────────────────────────── */}
      {editOpen && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Editar usuario</h2>
                <p className="text-xs text-gray-500 mt-0.5">Deja la contraseña vacía para no cambiarla</p>
              </div>
              <button onClick={() => setEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleEditar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input value={eNombre} onChange={e => setENombre(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={eEmail} onChange={e => setEEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={eRol} onChange={e => setERol(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input type="password" value={ePassword} onChange={e => setEPassword(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2
                             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {eError && (
                <div className="bg-red-50 border border-red-200 text-red-700
                                text-sm rounded-lg px-4 py-2.5">{eError}</div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" disabled={eGuardando}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium
                             rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                  {eGuardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
