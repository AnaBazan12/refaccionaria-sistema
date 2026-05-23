import api from './api'

export interface RespuestaPaginada<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPaginas: number
}

// Ordenes de trabajo
export const getOrdenes = async (filtros?: {
  estado?: string
  pagado?: boolean
  archivadas?: boolean
  page?: number
  limit?: number
}): Promise<RespuestaPaginada<any>> => {
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
  const { data } = await api.get('/clientes?limit=100')
  return data.data  // la ruta devuelve respuesta paginada { data: [...], total, ... }
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

// Buscar órdenes activas (para TALLER flow en Ventas)
export const buscarOrdenes = async (q: string) => {
  const { data } = await api.get('/ordenes', {
    params: { q, estado: 'EN_PROCESO', limit: 8 }
  })
  return data.data as any[]
}

// Agregar múltiples refacciones a una orden en lote
export const agregarRefaccionesLote = async (
  ordenId: string,
  items: { refaccionId: string; cantidad: number; precioUnitario?: number }[]
) => {
  const { data } = await api.post(`/ordenes/${ordenId}/detalle-lote`, { items })
  return data
}