import api from './api'
import { abrirPDF } from '../utils/pdf'

export const descargarPdfDiario = (fecha: string) =>
  abrirPDF(`/reportes/pdf/diario?fecha=${fecha}`, `reporte-diario-${fecha}.pdf`)

export const descargarPdfMensual = (mes: number, anio: number) =>
  abrirPDF(`/reportes/pdf/mensual?mes=${mes}&anio=${anio}`, `reporte-mensual-${anio}-${String(mes).padStart(2,'0')}.pdf`)

export const getReporteDiario = async (fecha?: string) => {
  const { data } = await api.get('/reportes/diario', {
    params: fecha ? { fecha } : {}
  })
  return data
}

export const getReporteMensual = async (mes: number, anio: number) => {
  const { data } = await api.get('/reportes/mensual', {
    params: { mes, anio }
  })
  return data
}

export const getStockBajo = async () => {
  const { data } = await api.get('/reportes/stock-bajo')
  return data
}

export const getHistorialVehiculo = async (vehiculoId: string) => {
  const { data } = await api.get(`/reportes/historial/${vehiculoId}`)
  return data
}