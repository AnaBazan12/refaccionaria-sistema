import api from './api'

export interface ResumenCaja {
  fecha:                string
  totalDia:             number
  totalPagosOrdenes:    number
  totalVentasMostrador: number
  totalGastos:          number
  utilidadNeta:         number
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
  porCategoria: {
    REFACCIONES: number
    NOMINA:      number
    SERVICIOS:   number
    OTROS:       number
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
  gastos: {
    id:            string
    hora:          string
    concepto:      string
    categoria:     string
    metodoPago:    string
    monto:         number
    notas:         string | null
    registradoPor: string
  }[]
}

export const getResumenCaja = async (fecha?: string): Promise<ResumenCaja> => {
  const { data } = await api.get('/caja/resumen', {
    params: fecha ? { fecha } : {}
  })
  // Normaliza campos que pueden faltar en versiones anteriores del backend
  return {
    totalGastos:  0,
    utilidadNeta: data.totalDia ?? 0,
    porCategoria: { REFACCIONES: 0, NOMINA: 0, SERVICIOS: 0, OTROS: 0 },
    gastos:       [],
    ...data,
  }
}

export const registrarGasto = async (gasto: {
  concepto:   string
  monto:      number
  categoria:  string
  metodoPago: string
  notas?:     string
}) => {
  const { data } = await api.post('/caja/gastos', gasto)
  return data
}

export const eliminarGasto = async (id: string) => {
  const { data } = await api.delete(`/caja/gastos/${id}`)
  return data
}
