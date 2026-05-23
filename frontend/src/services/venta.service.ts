import api from './api'

export const registrarVenta = async (venta: {
  refaccionId: string
  cantidad:    number
  tipoVenta:   'MOSTRADOR' | 'TALLER' | 'MAYOREO'
  ordenId?:    string
}) => {
  const { data } = await api.post('/ventas', venta)
  return data
}

export const registrarTicket = async (ticket: {
  tipoVenta:  'MOSTRADOR' | 'TALLER' | 'MAYOREO'
  items:      { refaccionId: string; cantidad: number }[]
  clienteId?: string
}) => {
  const { data } = await api.post('/ventas/ticket', ticket)
  return data
}

export const getHistorialVentasCliente = async (clienteId: string) => {
  const { data } = await api.get(`/ventas/cliente/${clienteId}`)
  return data
}

export const getVentasDelDia = async (fecha?: string) => {
  const { data } = await api.get('/ventas/dia', {
    params: fecha ? { fecha } : {}
  })
  return data
}

export const getReporteMensual = async (mes: number, anio: number) => {
  const { data } = await api.get('/ventas/mensual', { params: { mes, anio } })
  return data
}