import api from './api'

export const getCotizaciones = async () => {
  const { data } = await api.get('/cotizaciones')
  return data
}

export const getCotizacionPorId = async (id: string) => {
  const { data } = await api.get(`/cotizaciones/${id}`)
  return data
}

export const crearCotizacion = async (cotizacion: {
  clienteId:   string
  vehiculoId?: string
  notas?:      string
  validaHasta?: string
  items: {
    descripcion:    string
    cantidad:       number
    precioUnitario: number
    refaccionId?:   string
    servicioId?:    string
  }[]
}) => {
  const { data } = await api.post('/cotizaciones', cotizacion)
  return data
}

export const convertirEnOrden = async (id: string, extra: {
  mecanicoId?:  string
  kilometraje?: number
  diagnostico?: string
}) => {
  const { data } = await api.patch(`/cotizaciones/${id}/convertir`, extra)
  return data
}

export const rechazarCotizacion = async (id: string) => {
  const { data } = await api.patch(`/cotizaciones/${id}/rechazar`)
  return data
}