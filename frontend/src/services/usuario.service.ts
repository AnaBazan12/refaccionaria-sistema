import api from './api'

export const getUsuarios = async () => {
  const { data } = await api.get('/auth/usuarios')
  return data
}

export const crearUsuario = async (usuario: {
  nombre: string
  email: string
  password: string
  rol: string
}) => {
  const { data } = await api.post('/auth/registro', usuario)
  return data
}

export const toggleUsuario = async (id: string, activo: boolean) => {
  const { data } = await api.patch(`/auth/usuarios/${id}`, { activo })
  return data
}

export const editarUsuario = async (id: string, campos: {
  nombre?: string
  email?: string
  rol?: string
  nuevaPassword?: string
}) => {
  const { data } = await api.put(`/auth/usuarios/${id}`, campos)
  return data
}

export const cambiarPassword = async (passwordActual: string, passwordNuevo: string) => {
  const { data } = await api.patch('/auth/cambiar-password', { passwordActual, passwordNuevo })
  return data
}