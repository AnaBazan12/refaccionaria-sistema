import api from './api'

export const getRefacciones = async (filtros?: {
  stockBajo?: boolean
  q?: string
}) => {
  const { data } = await api.get('/refacciones', { params: filtros })
  return data
}

export const buscarRefaccion = async (q: string) => {
  const { data } = await api.get('/refacciones/buscar', { params: { q } })
  return data
}

export const crearRefaccion = async (refaccion: {
  codigo:          string
  nombre:          string
  descripcion?:    string
  marca?:          string
  costoCompra:     number
  margenGanancia:  number
  precioMostrador: number
  precioTaller:    number
  precioMayoreo?:  number
  stockActual:     number
  stockMinimo:     number
  proveedorId?:    string
}) => {
  const { data } = await api.post('/refacciones', refaccion)
  return data
}

export const actualizarRefaccion = async (id: string, refaccion: any) => {
  const { data } = await api.put(`/refacciones/${id}`, refaccion)
  return data
}

export const entradaInventario = async (
  id: string,
  cantidad: number,
  motivo?: string
) => {
  const { data } = await api.post(`/refacciones/${id}/entrada`, {
    cantidad, motivo
  })
  return data
}

export const eliminarRefaccion = async (id: string) => {
  const { data } = await api.delete(`/refacciones/${id}`)
  return data
}

export const getProveedores = async () => {
  const { data } = await api.get('/proveedores')
  return data
}