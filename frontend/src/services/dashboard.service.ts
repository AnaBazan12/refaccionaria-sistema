import api from './api'

export const getDashboardData = async () => {
  const { data } = await api.get('/dashboard')
  return data
}

// Legacy — mantenidos por si algo más los usa
export const getReporteDiario = async (fecha?: string) => {
  const params = fecha ? { fecha } : {}
  const { data } = await api.get('/reportes/diario', { params })
  return data
}

export const getStockBajo = async () => {
  const { data } = await api.get('/reportes/stock-bajo')
  return data
}

export const getOrdenesActivas = async () => {
  const { data } = await api.get('/ordenes', {
    params: { estado: 'EN_PROCESO', limit: 50 }
  })
  return Array.isArray(data) ? data : (data.data ?? [])
}
