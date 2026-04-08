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