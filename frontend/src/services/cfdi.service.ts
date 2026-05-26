import api from './api'

export interface CfdiReceptorInput {
  rfc:            string
  nombre:         string
  usoCfdi:        string
  regimenFiscal:  string
  codigoPostal:   string
}

export interface CfdiItemInput {
  descripcion:    string
  cantidad:       number
  precioUnitario: number
  codigoSat?:     string
  claveUnidad?:   string
}

export interface CrearCfdiPayload {
  ordenId?:   string
  receptor:   CfdiReceptorInput
  items:      CfdiItemInput[]
  formaPago:  string
  metodoPago: string
}

export interface CfdiRow {
  id:          string
  uuid:        string
  serie:       string | null
  folio:       number
  fecha:       string
  subtotal:    string
  iva:         string
  total:       string
  rfcEmisor:   string
  rfcReceptor: string
  receptor:    string
  usoCfdi:     string
  formaPago:   string
  estado:      'vigente' | 'cancelado'
  facturamaId: string | null
  createdAt:   string
  ordenId:     string | null
  orden?:      { numero: number; descripcionFalla: string | null } | null
}

export interface ListaCfdisResult {
  total:   number
  pagina:  number
  paginas: number
  cfdis:   CfdiRow[]
}

export const listarCfdis = async (params?: { page?: number; limit?: number }) => {
  const { data } = await api.get<ListaCfdisResult>('/cfdi', { params })
  return data
}

export const crearFactura = async (payload: CrearCfdiPayload) => {
  const { data } = await api.post('/cfdi/crear', payload)
  return data as { mensaje: string; cfdi: CfdiRow }
}

export const subirCsd = async (payload: {
  cerBase64: string
  keyBase64: string
  keyPass:   string
}) => {
  const { data } = await api.post('/cfdi/csd', payload)
  return data as { mensaje: string }
}

export const cancelarCfdi = async (id: string, motivo = '02') => {
  const { data } = await api.delete(`/cfdi/${id}`, { data: { motivo } })
  return data as { mensaje: string }
}

// URL para descargar PDF/XML directamente (abre en nueva pestaña o descarga)
export const urlPdf = (id: string) => `${api.defaults.baseURL}/cfdi/${id}/pdf`
export const urlXml = (id: string) => `${api.defaults.baseURL}/cfdi/${id}/xml`
