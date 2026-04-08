import api from './api'

// Ordenes de trabajo
export const getOrdenes = async (filtros?: {
  estado?: string
  pagado?: boolean
  archivadas?: boolean // <--- AGREGAMOS ESTA LÍNEA
}) => {
  const { data } = await api.get('/ordenes', { params: filtros })
  return data
}

export const getOrdenPorId = async (id: string) => {
  const { data } = await api.get(`/ordenes/${id}`)
  return data
}

export const crearOrden = async (orden: any) => {
  const { data } = await api.post('/ordenes', orden)
  return data
}

export const cambiarEstado = async (id: string, estado: string) => {
  const { data } = await api.patch(`/ordenes/${id}/estado`, { estado })
  return data
}

export const marcarPagada = async (id: string) => {
  const { data } = await api.patch(`/ordenes/${id}/pagar`)
  return data
}

export const agregarServicioOrden = async (
  id: string,
  servicio: { servicioId: string; cantidad: number; precioUnitario: number; notas?: string }
) => {
  const { data } = await api.post(`/ordenes/${id}/servicios`, servicio)
  return data
}

// Para los selects del formulario
export const getClientes = async () => {
  const { data } = await api.get('/clientes')
  return data
}

export const getVehiculosPorCliente = async (clienteId: string) => {
  const { data } = await api.get(`/vehiculos/cliente/${clienteId}`)
  return data
}

export const getMecanicos = async () => {
  const { data } = await api.get('/mecanicos')
  return data
}

export const getServicios = async () => {
  const { data } = await api.get('/servicios')
  return data
}