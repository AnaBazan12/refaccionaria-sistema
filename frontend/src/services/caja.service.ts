import api from './api'

export interface ResumenCaja {
  fecha:                string
  totalDia:             number
  totalPagosOrdenes:    number
  totalVentasMostrador: number
  ordenesPagadas:       number
  porMetodo: {
    EFECTIVO:      number
    TARJETA:       number
    TRANSFERENCIA: number
  }
  porTipo: {
    CONTADO:  number
    ANTICIPO: number
    ABONO:    number
    CREDITO:  number
  }
  pagos: {
    id:            string
    hora:          string
    tipo:          string
    metodoPago:    string
    monto:         number
    notas:         string | null
    orden: {
      numero:   number
      cliente:  string
      vehiculo: string
    }
    registradoPor: string
  }[]
  ventas: {
    id:         string
    hora:       string
    refaccion:  string
    codigo:     string
    cantidad:   number
    precioUnit: number
    subtotal:   number
    ganancia:   number
  }[]
}

export const getResumenCaja = async (fecha?: string): Promise<ResumenCaja> => {
  const { data } = await api.get('/caja/resumen', {
    params: fecha ? { fecha } : {}
  })
  return data
}
