export const ESTADOS_ORDEN = [
  'RECIBIDO',
  'EN_PROCESO',
  'EN_ESPERA_REFACCION',
  'LISTO',
  'ENTREGADO',
  'CANCELADO'
]

export const colorEstado: Record<string, string> = {
  RECIBIDO:            'bg-gray-100    text-gray-700',
  EN_PROCESO:          'bg-blue-100    text-blue-700',
  EN_ESPERA_REFACCION: 'bg-yellow-100  text-yellow-700',
  LISTO:               'bg-green-100   text-green-700',
  ENTREGADO:           'bg-purple-100  text-purple-700',
  CANCELADO:           'bg-red-100     text-red-700',
}

export const labelEstado: Record<string, string> = {
  RECIBIDO:            'Recibido',
  EN_PROCESO:          'En proceso',
  EN_ESPERA_REFACCION: 'Espera refacción',
  LISTO:               'Listo',
  ENTREGADO:           'Entregado',
  CANCELADO:           'Cancelado',
}