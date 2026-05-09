import api from './api'
import type { RespuestaPaginada } from './orden.service'

export const getClientes = async (params?: {
  q?: string
  page?: number
  limit?: number
}): Promise<RespuestaPaginada<any>> => {
  const { data } = await api.get('/clientes', { params })
  return data
}

export const getClientePorId = async (id: string) => {
  const { data } = await api.get(`/clientes/${id}`)
  return data
}

export const crearCliente = async (cliente: {
  nombre:    string
  telefono?: string
  email?:    string
  direccion?: string
}) => {
  const { data } = await api.post('/clientes', cliente)
  return data
}

export const actualizarCliente = async (id: string, cliente: {
  nombre?:    string
  telefono?:  string
  email?:     string
  direccion?: string
}) => {
  const { data } = await api.put(`/clientes/${id}`, cliente)
  return data
}

export const eliminarCliente = async (id: string) => {
  const { data } = await api.delete(`/clientes/${id}`)
  return data
}