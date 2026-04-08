import api from './api'

export const getProveedores = async () => {
  const { data } = await api.get('/proveedores')
  return data
}

export const crearProveedor = async (proveedor: {
  nombre:               string
  contacto?:            string
  telefono?:            string
  ivaPorcentaje:        number
  descuentoPorcentaje:  number
}) => {
  const { data } = await api.post('/proveedores', proveedor)
  return data
}

export const actualizarProveedor = async (id: string, proveedor: any) => {
  const { data } = await api.put(`/proveedores/${id}`, proveedor)
  return data
}

export const calcularFactura = async (factura: {
  proveedorId:   string
  subtotal:      number
  numeroFactura: string
  notas?:        string
}) => {
  const { data } = await api.post('/proveedores/facturas/calcular', factura)
  return data
}

export const getFacturas = async (proveedorId?: string) => {
  const { data } = await api.get('/proveedores/facturas', {
    params: proveedorId ? { proveedorId } : {}
  })
  return data
}

export const marcarFacturaPagada = async (id: string) => {
  const { data } = await api.patch(`/proveedores/facturas/${id}/pagar`)
  return data
}