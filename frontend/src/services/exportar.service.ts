import api from './api'

// Descarga un archivo Excel desde el backend
async function descargarExcel(url: string, nombre: string) {
  const resp = await api.get(url, { responseType: 'blob' })
  const blob = new Blob([resp.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const link = document.createElement('a')
  link.href   = URL.createObjectURL(blob)
  link.download = nombre
  link.click()
  URL.revokeObjectURL(link.href)
}

export const exportOrdenes = (desde?: string, hasta?: string, estado?: string) => {
  const params = new URLSearchParams()
  if (desde)  params.set('desde',  desde)
  if (hasta)  params.set('hasta',  hasta)
  if (estado) params.set('estado', estado)
  const q = params.toString()
  return descargarExcel(`/exportar/ordenes${q ? `?${q}` : ''}`, `ordenes_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const exportClientes    = () => descargarExcel('/exportar/clientes',   `clientes_${new Date().toISOString().split('T')[0]}.xlsx`)
export const exportInventario  = () => descargarExcel('/exportar/inventario', `inventario_${new Date().toISOString().split('T')[0]}.xlsx`)
export const exportDeudas      = () => descargarExcel('/exportar/deudas',     `deudas_${new Date().toISOString().split('T')[0]}.xlsx`)
