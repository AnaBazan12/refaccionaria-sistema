import api from './api'

export const getVehiculos = async () => {
  const { data } = await api.get('/vehiculos')
  return data
}

export const getVehiculosPorCliente = async (clienteId: string) => {
  const { data } = await api.get(`/vehiculos/cliente/${clienteId}`)
  return data
}

export const buscarPorPlaca = async (placa: string) => {
  const { data } = await api.get(`/vehiculos/placa/${placa}`)
  return data
}

export const crearVehiculo = async (vehiculo: {
  
  placa:       string
  marca:       string
  modelo:      string
  anio:        number
  color?:      string
  numSerie?:   string
  kilometraje?: number
  notas?:      string
  clienteId:   string
}) => {
  const { data } = await api.post('/vehiculos', vehiculo)
  return data
}

export const actualizarVehiculo = async (id: string, vehiculo: {
  placa?:       string
  marca?:       string
  modelo?:      string
  anio?:        number
  color?:       string
  numSerie?:    string
  kilometraje?: number
  notas?:       string
}) => {
  const { data } = await api.put(`/vehiculos/${id}`, vehiculo)
  return data
}

export const eliminarVehiculo = async (id: string) => {
  const { data } = await api.delete(`/vehiculos/${id}`)
  return data
}