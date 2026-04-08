import api from '../services/api'

export const abrirPDF = async (url: string, nombre: string) => {
  try {
    const response = await api.get(url, { responseType: 'blob' })
    const blob     = new Blob([response.data], { type: 'application/pdf' })
    const blobUrl  = URL.createObjectURL(blob)

    // Abrir en nueva pestaña
    const ventana = window.open(blobUrl, '_blank')
    if (!ventana) {
      // Si el navegador bloquea popups, descargar directo
      const link    = document.createElement('a')
      link.href     = blobUrl
      link.download = nombre
      link.click()
    }

    // Liberar memoria después de 60 segundos
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
  } catch (error) {
    console.error('Error abriendo PDF:', error)
    alert('Error al generar el PDF')
  }
}