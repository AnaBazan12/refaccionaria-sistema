import { Request, Response } from 'express'
import { prisma }           from '../utils/prisma'
import {
  subirCsd,
  crearCfdi,
  descargarCfdi,
  cancelarCfdi,
  CfdiInput,
} from '../services/facturama.service'

// ── Helper: leer config CFDI ──────────────────────────────────
async function getCfdiConfig() {
  const cfg = await prisma.configNegocio.findUnique({ where: { id: 'singleton' } })
  if (!cfg) throw new Error('No existe configuración del negocio')

  const user = cfg.cfdiFacturamaUser
  const pass = cfg.cfdiFacturamaPass
  if (!user || !pass) throw new Error('Configura usuario y contraseña de Facturama en Configuración → Facturación')

  const emisorRfc    = cfg.rfc
  const emisorNombre = cfg.nombre
  const emisorRegimen = cfg.cfdiRegimenFiscal
  const emisorCp     = cfg.cfdiCodigoPostal
  if (!emisorRfc)    throw new Error('RFC del negocio no configurado')
  if (!emisorRegimen) throw new Error('Régimen fiscal no configurado')
  if (!emisorCp)     throw new Error('Código postal fiscal no configurado')

  return {
    sandbox:       cfg.cfdiSandbox ?? true,
    user,
    pass,
    emisorRfc,
    emisorNombre:  emisorNombre ?? emisorRfc,
    emisorRegimen,
    emisorCp,
    serie:         cfg.cfdiSerie ?? 'A',
  }
}

// ── POST /api/cfdi/csd ────────────────────────────────────────
// Sube los archivos CSD a Facturama (una sola vez)
export async function uploadCsd(req: Request, res: Response) {
  try {
    const { cerBase64, keyBase64, keyPass } = req.body as {
      cerBase64: string
      keyBase64: string
      keyPass:   string
    }
    if (!cerBase64 || !keyBase64 || !keyPass) {
      res.status(400).json({ mensaje: 'Faltan cerBase64, keyBase64 o keyPass' })
      return
    }

    const cfg = await getCfdiConfig()
    await subirCsd({
      sandbox:   cfg.sandbox,
      user:      cfg.user,
      pass:      cfg.pass,
      rfc:       cfg.emisorRfc,
      cerBase64,
      keyBase64,
      keyPass,
    })

    // Marcar que ya se subió el CSD
    await prisma.configNegocio.update({
      where: { id: 'singleton' },
      data:  { cfdiCsdSubido: true },
    })

    res.json({ mensaje: 'CSD subido correctamente a Facturama' })
  } catch (err: any) {
    console.error('Error subiendo CSD:', err)
    res.status(500).json({ mensaje: err.message })
  }
}

// ── POST /api/cfdi/crear ──────────────────────────────────────
// Crea y timbra un CFDI a partir de una orden de trabajo (opcional)
export async function crearFactura(req: Request, res: Response) {
  try {
    const {
      ordenId,
      receptor,     // { rfc, nombre, usoCfdi, regimenFiscal, codigoPostal }
      items,        // [ { descripcion, cantidad, precioUnitario, codigoSat?, claveUnidad? } ]
      formaPago,    // '01' efectivo, '03' transferencia, '04' tarjeta
      metodoPago,   // 'PUE' | 'PPD'
    } = req.body

    if (!receptor?.rfc || !receptor?.nombre || !items?.length) {
      res.status(400).json({ mensaje: 'Faltan receptor o items' })
      return
    }

    const cfg = await getCfdiConfig()

    // Calcular folio: último folio + 1
    const ultimo = await prisma.cfdi.findFirst({
      where:   { rfcEmisor: cfg.emisorRfc, serie: cfg.serie },
      orderBy: { folio: 'desc' },
      select:  { folio: true },
    })
    const folio = (ultimo?.folio ?? 0) + 1

    const cfdiInput: CfdiInput = {
      emisorRfc:    cfg.emisorRfc,
      emisorNombre: cfg.emisorNombre,
      emisorRegimen:cfg.emisorRegimen,
      emisorCp:     cfg.emisorCp,
      serie:        cfg.serie,
      folio,
      receptor: {
        rfc:           receptor.rfc,
        nombre:        receptor.nombre,
        usoCfdi:       receptor.usoCfdi   ?? 'G03',
        regimenFiscal: receptor.regimenFiscal ?? '616',
        codigoPostal:  receptor.codigoPostal  ?? cfg.emisorCp,
      },
      items,
      formaPago:  formaPago  ?? '01',
      metodoPago: metodoPago ?? 'PUE',
    }

    const resultado = await crearCfdi({
      sandbox: cfg.sandbox,
      user:    cfg.user,
      pass:    cfg.pass,
      cfdi:    cfdiInput,
    })

    // Guardar en BD
    const cfdiDb = await prisma.cfdi.create({
      data: {
        id:          resultado.id,
        uuid:        resultado.uuid,
        serie:       cfg.serie,
        folio,
        fecha:       new Date(resultado.fecha),
        subtotal:    resultado.subtotal,
        iva:         resultado.iva,
        total:       resultado.total,
        rfcEmisor:   cfg.emisorRfc,
        rfcReceptor: receptor.rfc,
        receptor:    receptor.nombre,
        usoCfdi:     receptor.usoCfdi ?? 'G03',
        formaPago:   formaPago ?? '01',
        estado:      'vigente',
        facturamaId: resultado.id,
        ordenId:     ordenId ?? null,
      },
    })

    res.status(201).json({ mensaje: 'CFDI timbrado', cfdi: cfdiDb })
  } catch (err: any) {
    console.error('Error creando CFDI:', err)
    res.status(500).json({ mensaje: err.message })
  }
}

// ── GET /api/cfdi ─────────────────────────────────────────────
// Listar todos los CFDIs con paginación
export async function listarCfdis(req: Request, res: Response) {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(50, Number(req.query.limit) || 20)
    const skip  = (page - 1) * limit

    const [total, cfdis] = await Promise.all([
      prisma.cfdi.count(),
      prisma.cfdi.findMany({
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orden: {
            select: { numero: true, diagnostico: true },
          },
        },
      }),
    ])

    res.json({
      total,
      pagina:   page,
      paginas:  Math.ceil(total / limit),
      cfdis,
    })
  } catch (err: any) {
    console.error('Error listando CFDIs:', err)
    res.status(500).json({ mensaje: err.message })
  }
}

// ── GET /api/cfdi/:id/pdf ─────────────────────────────────────
export async function descargarPdf(req: Request, res: Response) {
  try {
    const cfdi = await prisma.cfdi.findUnique({ where: { id: String(req.params.id) } })
    if (!cfdi || !cfdi.facturamaId) {
      res.status(404).json({ mensaje: 'CFDI no encontrado' })
      return
    }

    const cfg = await getCfdiConfig()
    const buffer = await descargarCfdi({
      sandbox:     cfg.sandbox,
      user:        cfg.user,
      pass:        cfg.pass,
      facturamaId: cfdi.facturamaId,
      formato:     'pdf',
    })

    res.setHeader('Content-Type',        'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="factura-${cfdi.serie ?? ''}${cfdi.folio}.pdf"`)
    res.send(buffer)
  } catch (err: any) {
    console.error('Error descargando PDF CFDI:', err)
    res.status(500).json({ mensaje: err.message })
  }
}

// ── GET /api/cfdi/:id/xml ─────────────────────────────────────
export async function descargarXml(req: Request, res: Response) {
  try {
    const cfdi = await prisma.cfdi.findUnique({ where: { id: String(req.params.id) } })
    if (!cfdi || !cfdi.facturamaId) {
      res.status(404).json({ mensaje: 'CFDI no encontrado' })
      return
    }

    const cfg = await getCfdiConfig()
    const buffer = await descargarCfdi({
      sandbox:     cfg.sandbox,
      user:        cfg.user,
      pass:        cfg.pass,
      facturamaId: cfdi.facturamaId,
      formato:     'xml',
    })

    res.setHeader('Content-Type',        'application/xml')
    res.setHeader('Content-Disposition', `attachment; filename="factura-${cfdi.serie ?? ''}${cfdi.folio}.xml"`)
    res.send(buffer)
  } catch (err: any) {
    console.error('Error descargando XML CFDI:', err)
    res.status(500).json({ mensaje: err.message })
  }
}

// ── DELETE /api/cfdi/:id ──────────────────────────────────────
export async function cancelarFactura(req: Request, res: Response) {
  try {
    const { motivo } = req.body as { motivo?: string }

    const cfdi = await prisma.cfdi.findUnique({ where: { id: String(req.params.id) } })
    if (!cfdi) {
      res.status(404).json({ mensaje: 'CFDI no encontrado' })
      return
    }
    if (cfdi.estado === 'cancelado') {
      res.status(400).json({ mensaje: 'El CFDI ya está cancelado' })
      return
    }
    if (!cfdi.facturamaId) {
      res.status(400).json({ mensaje: 'CFDI sin ID de Facturama, no se puede cancelar' })
      return
    }

    const cfg = await getCfdiConfig()
    await cancelarCfdi({
      sandbox:     cfg.sandbox,
      user:        cfg.user,
      pass:        cfg.pass,
      facturamaId: cfdi.facturamaId,
      motivo:      motivo ?? '02',
    })

    await prisma.cfdi.update({
      where: { id: String(req.params.id) },
      data:  { estado: 'cancelado' },
    })

    res.json({ mensaje: 'CFDI cancelado correctamente' })
  } catch (err: any) {
    console.error('Error cancelando CFDI:', err)
    res.status(500).json({ mensaje: err.message })
  }
}
