/**
 * Servicio de integración con Facturama API para timbrado CFDI 4.0
 * Docs: https://apisandbox.facturama.mx/docs
 */

export interface CfdiReceptor {
  rfc:            string   // XAXX010101000 para público general
  nombre:         string
  usoCfdi:        string   // G03, S01, G01...
  regimenFiscal:  string   // 616 público general, 612 persona física...
  codigoPostal:   string   // CP domicilio fiscal del receptor
}

export interface CfdiItem {
  descripcion:    string
  cantidad:       number
  precioUnitario: number  // SIN IVA
  codigoSat?:     string  // 78101803 servicios taller, 25172500 refacciones
  claveUnidad?:   string  // E48 servicio, H87 pieza
}

export interface CfdiInput {
  emisorRfc:       string
  emisorNombre:    string
  emisorRegimen:   string
  emisorCp:        string
  serie:           string
  folio:           number
  receptor:        CfdiReceptor
  items:           CfdiItem[]
  formaPago:       string  // 01 efectivo, 03 transferencia, 04 tarjeta
  metodoPago:      string  // PUE | PPD
}

export interface CfdiResponse {
  id:       string   // ID interno Facturama
  uuid:     string   // UUID SAT
  fecha:    string
  subtotal: number
  iva:      number
  total:    number
}

const IVA_TASA = 0.16

function baseUrl(sandbox: boolean) {
  return sandbox
    ? 'https://apisandbox.facturama.mx'
    : 'https://api.facturama.mx'
}

function authHeader(user: string, pass: string) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
}

// ── Subir CSD a Facturama (una sola vez por negocio) ─────────
export async function subirCsd(opts: {
  sandbox:   boolean
  user:      string
  pass:      string
  rfc:       string
  cerBase64: string
  keyBase64: string
  keyPass:   string
}): Promise<void> {
  const res = await fetch(`${baseUrl(opts.sandbox)}/api/Csds`, {
    method:  'POST',
    headers: {
      'Authorization': authHeader(opts.user, opts.pass),
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      Rfc:                opts.rfc,
      Certificate:        opts.cerBase64,
      PrivateKey:         opts.keyBase64,
      PrivateKeyPassword: opts.keyPass,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Error subiendo CSD: ${res.status} — ${body}`)
  }
}

// ── Crear y timbrar CFDI ──────────────────────────────────────
export async function crearCfdi(opts: {
  sandbox: boolean
  user:    string
  pass:    string
  cfdi:    CfdiInput
}): Promise<CfdiResponse> {
  const { cfdi } = opts

  // Construir items con IVA desglosado
  const items = cfdi.items.map(item => {
    const subtotal = item.precioUnitario * item.cantidad
    const ivaItem  = subtotal * IVA_TASA
    return {
      ProductCode:          item.codigoSat ?? '78101803',
      IdentificationNumber: String(Math.random()).slice(2, 8),
      Description:          item.descripcion,
      Unit:                 item.claveUnidad ?? 'E48',
      UnitCode:             item.claveUnidad ?? 'E48',
      UnitPrice:            item.precioUnitario,
      Quantity:             item.cantidad,
      Subtotal:             subtotal,
      Taxes: [{
        Total:       ivaItem,
        Name:        'IVA',
        Base:        subtotal,
        Rate:        IVA_TASA,
        IsRetention: false,
      }],
      Total: subtotal + ivaItem,
    }
  })

  const payload = {
    Serie:           cfdi.serie,
    Folio:           String(cfdi.folio),
    CfdiType:        'I',
    PaymentForm:     cfdi.formaPago,
    Currency:        'MXN',
    ExpeditionPlace: cfdi.emisorCp,
    PaymentMethod:   cfdi.metodoPago,
    Issuer: {
      FiscalRegime: cfdi.emisorRegimen,
      Rfc:          cfdi.emisorRfc,
      Name:         cfdi.emisorNombre,
    },
    Receiver: {
      Rfc:           cfdi.receptor.rfc,
      Name:          cfdi.receptor.nombre,
      CfdiUse:       cfdi.receptor.usoCfdi,
      FiscalRegime:  cfdi.receptor.regimenFiscal,
      TaxZipCode:    cfdi.receptor.codigoPostal,
    },
    Items: items,
  }

  const res = await fetch(`${baseUrl(opts.sandbox)}/api/Cfdi`, {
    method:  'POST',
    headers: {
      'Authorization': authHeader(opts.user, opts.pass),
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Error timbrado CFDI: ${res.status} — ${body}`)
  }

  const data = await res.json() as any

  const subtotalTotal = cfdi.items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
  const ivaTotal      = subtotalTotal * IVA_TASA

  return {
    id:       data.Id       ?? data.id,
    uuid:     data.Complement?.TaxStamp?.Uuid ?? data.uuid ?? '',
    fecha:    data.Date     ?? new Date().toISOString(),
    subtotal: subtotalTotal,
    iva:      ivaTotal,
    total:    subtotalTotal + ivaTotal,
  }
}

// ── Descargar PDF o XML ───────────────────────────────────────
export async function descargarCfdi(opts: {
  sandbox:    boolean
  user:       string
  pass:       string
  facturamaId:string
  formato:    'pdf' | 'xml'
}): Promise<Buffer> {
  const tipo = 'issued'  // facturas emitidas
  const url  = `${baseUrl(opts.sandbox)}/api/Cfdi/${tipo}/${opts.facturamaId}/${opts.formato}`

  const res = await fetch(url, {
    headers: { 'Authorization': authHeader(opts.user, opts.pass) },
  })

  if (!res.ok) throw new Error(`Error descargando ${opts.formato}: ${res.status}`)

  // Facturama devuelve base64 en JSON
  const data    = await res.json() as any
  const content = data.Content ?? data.content ?? ''
  return Buffer.from(content, 'base64')
}

// ── Cancelar CFDI ─────────────────────────────────────────────
export async function cancelarCfdi(opts: {
  sandbox:     boolean
  user:        string
  pass:        string
  facturamaId: string
  motivo:      string  // "02" comprobante emitido con errores sin relación
}): Promise<void> {
  const url = `${baseUrl(opts.sandbox)}/api/Cfdi/${opts.facturamaId}?motive=${opts.motivo}`

  const res = await fetch(url, {
    method:  'DELETE',
    headers: { 'Authorization': authHeader(opts.user, opts.pass) },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Error cancelando CFDI: ${res.status} — ${body}`)
  }
}
