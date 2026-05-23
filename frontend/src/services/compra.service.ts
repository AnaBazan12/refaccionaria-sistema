import api from './api'

export interface ItemCompra {
  refaccionId:   string
  cantidad:      number
  costoUnitario: number
}

export const registrarCompra = async (compra: {
  proveedorId?:     string
  facturaNumero?:   string
  notas?:           string
  actualizarCostos: boolean
  items:            ItemCompra[]
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
