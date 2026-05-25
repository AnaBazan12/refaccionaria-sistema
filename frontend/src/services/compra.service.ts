import api from './api'

export interface ItemCompra {
  refaccionId:   string
  cantidad:      number
  costoUnitario: number
}

export const registrarCompra = async (compra: {
  proveedorId?:      string
  facturaNumero?:    string
  notas?:            string
  actualizarCostos:  boolean
  esCredito?:        boolean
  fechaVencimiento?: string
  telefonoContacto?: string
  items:             ItemCompra[]
}) => {
  const { data } = await api.post('/compras', compra)
  return data
}

export const getCompras = async (params?: {
  proveedorId?: string
  desde?:       string
  hasta?:       string
  page?:        number
  limit?:       number
}) => {
  const { data } = await api.get('/compras', { params })
  return data
}

export const eliminarCompra = async (id: string) => {
  const { data } = await api.delete(`/compras/${id}`)
  return data
}

export const marcarCompraPagada = async (id: string) => {
  const { data } = await api.patch(`/compras/${id}/pagar`)
  return data
}

export const getComprasPorVencer = async () => {
  const { data } = await api.get('/compras/por-vencer')
  return data
}
