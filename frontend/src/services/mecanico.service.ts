import api from './api'

export const getMecanicos = async () => {
  const { data } = await api.get('/mecanicos')
  return data
}

export const crearMecanico = async (mecanico: {
  nombre:       string
  telefono?:    string
  especialidad?: string
  usuarioId?:   string
}) => {
  const { data } = await api.post('/mecanicos', mecanico)
  return data
}

export const actualizarMecanico = async (id: string, mecanico: {
  nombre?:       string
  telefono?:     string
  especialidad?: string
  usuarioId?:    string
}) => {
  const { data } = await api.put(`/mecanicos/${id}`, mecanico)
  return data
}

export const eliminarMecanico = async (id: string) => {
  const { data } = await api.delete(`/mecanicos/${id}`)
  return data
}

export const getUsuariosMecanicos = async () => {
  const { data } = await api.get('/auth/usuarios')
  // Solo usuarios con rol MECANICO sin vincular
  return data.filter((u: any) => u.rol === 'MECANICO')
}