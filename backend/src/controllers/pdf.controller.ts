import { Request, Response } from 'express'
import PDFDocument           from 'pdfkit'
import { prisma }            from '../utils/prisma'
import path                  from 'path'
import fs                    from 'fs'
import QRCode                from 'qrcode'

// Ruta al logo del negocio
const LOGO_PATH = path.join(__dirname, '../assets/LogoRefaccionaria.png')

// ── Datos del negocio: BD > env vars > defaults ───────────────
async function getNegocio() {
  try {
    const cfg = await prisma.configNegocio.findUnique({ where: { id: 'singleton' } })
    if (cfg) return cfg
  } catch { /* ignorar si tabla no existe aún */ }
  return {
    nombre:    process.env.NEGOCIO_NOMBRE    ?? 'REFACCIONARIA & TALLER',
    subtitulo: process.env.NEGOCIO_SUBTITULO ?? 'Servicio mecánico profesional',
    telefono:  process.env.NEGOCIO_TELEFONO  ?? '',
    direccion: process.env.NEGOCIO_DIRECCION ?? '',
    ciudad:    process.env.NEGOCIO_CIUDAD    ?? '',
  }
}

// ── Helper: formato de moneda ─────────────────────────────────
const fmt = (n: any) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

// ── Helper: dibujar línea separadora ─────────────────────────
const linea = (doc: PDFKit.PDFDocument, y: number, color = '#e5e7eb') => {
  doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(1).stroke()
}

// ── Helper: dibujar logo ──────────────────────────────────────
const dibujarLogo = (doc: PDFKit.PDFDocument, x: number, y: number, negocio: Pick<NegocioInfo, 'nombre' | 'logo'>) => {
  const size = 52

  // 1. Logo personalizado desde BD (base64)
  if (negocio.logo) {
    try {
      const buffer = Buffer.from(negocio.logo, 'base64')
      doc.save()
      doc.roundedRect(x, y, size, size, 8).clip()
      doc.image(buffer, x, y, { fit: [size, size], align: 'center', valign: 'center' })
      doc.restore()
      return
    } catch { /* cae al siguiente */ }
  }

  // 2. Logo desde sistema de archivos (instalaciones con logo en disco)
  if (fs.existsSync(LOGO_PATH)) {
    try {
      doc.save()
      doc.roundedRect(x, y, size, size, 8).clip()
      doc.image(LOGO_PATH, x, y, { width: size, height: size, cover: [size, size] })
      doc.restore()
      return
    } catch { /* cae al vectorial */ }
  }

  // 3. Avatar vectorial con inicial
  doc.roundedRect(x, y, size, size, 8).fillColor('#1d4ed8').fill()
  doc.rect(x, y + size - 10, size, 10).fillColor('#1e3a8a').fill()
  doc.circle(x + size / 2, y + size / 2 - 3, 18).fillColor('#2563eb').fill()

  const inicial = negocio.nombre.charAt(0).toUpperCase()
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
     .text(inicial, x, y + 13, { width: size, align: 'center' })
  doc.fillColor('#93c5fd').fontSize(7).font('Helvetica')
     .text('TALLER', x, y + 39, { width: size, align: 'center' })
}

// ── Helper: encabezado del negocio ────────────────────────────
type NegocioInfo = { nombre: string; subtitulo: string; telefono: string; direccion: string; ciudad: string; logo?: string | null }

const encabezado = (
  doc:     PDFKit.PDFDocument,
  titulo:  string,
  numero:  string,
  negocio: NegocioInfo
): number => {
  const alturaHeader = 90

  doc.rect(0, 0, 595, alturaHeader).fillColor('#0f172a').fill()

  dibujarLogo(doc, 30, 19, negocio)

  doc.fillColor('#ffffff')
     .fontSize(17).font('Helvetica-Bold')
     .text(negocio.nombre, 95, 22, { width: 280 })

  doc.fillColor('#94a3b8')
     .fontSize(8.5).font('Helvetica')
     .text(negocio.subtitulo, 95, 43)

  let infoY = 57
  if (negocio.telefono) {
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
       .text(`Tel. ${negocio.telefono}`, 95, infoY)
    infoY += 11
  }
  if (negocio.ciudad || negocio.direccion) {
    const lugar = [negocio.direccion, negocio.ciudad].filter(Boolean).join(', ')
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
       .text(`Dir. ${lugar}`, 95, infoY)
  }

  // Separador vertical
  doc.moveTo(385, 15).lineTo(385, alturaHeader - 15)
     .strokeColor('#1e293b').lineWidth(1).stroke()

  // Título y número del documento
  doc.fillColor('#60a5fa')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text(titulo, 395, 22, { align: 'right', width: 150 })

  doc.fillColor('#ffffff')
     .fontSize(22)
     .font('Helvetica-Bold')
     .text(numero, 395, 37, { align: 'right', width: 150 })

  // Fecha de emisión
  const fechaEmision = new Date().toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
  doc.fillColor('#64748b')
     .fontSize(7.5)
     .font('Helvetica')
     .text(`Emitido: ${fechaEmision}`, 395, 67, { align: 'right', width: 150 })

  doc.fillColor('#000000')
  return alturaHeader + 12
}

// ── PDF de Orden de Trabajo ───────────────────────────────────
export const pdfOrden = async (req: Request, res: Response) => {
  try {
    const orden = await prisma.ordenTrabajo.findUnique({
      where:   { id: req.params.id as string },
      include: {
        cliente:  true,
        vehiculo: true,
        mecanico: true,
        servicios: { include: { servicio: true } },
        detalle:   { include: { refaccion: true } },
        pagos:     true
      }
    })

    if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' })

    const negocio = await getNegocio()

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="orden-${orden.numero}.pdf"`)
    doc.pipe(res)

    let y = encabezado(doc, 'ORDEN DE TRABAJO', `#${orden.numero}`, negocio)

    // ── Bloques cliente / vehículo ──────────────────────────
    doc.rect(50, y, 240, 95).fillColor('#f8fafc').fill()
    doc.rect(305, y, 240, 95).fillColor('#f8fafc').fill()

    // — Cliente —
    doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('CLIENTE', 60, y + 10)
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
       .text(orden.cliente?.nombre ?? '—', 60, y + 22, { width: 220 })
    doc.fillColor('#475569').fontSize(9).font('Helvetica')
       .text(`Tel: ${orden.cliente?.telefono ?? 'N/A'}`, 60, y + 38)
    if (orden.cliente?.email)
      doc.text(orden.cliente.email, 60, y + 51)
    if (orden.cliente?.direccion)
      doc.text(orden.cliente.direccion, 60, y + 64, { width: 220 })

    // — Vehículo —
    doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('VEHÍCULO', 315, y + 10)
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
       .text(`${orden.vehiculo?.marca} ${orden.vehiculo?.modelo}`, 315, y + 22)
    doc.fillColor('#475569').fontSize(9).font('Helvetica')
       .text(`Año: ${orden.vehiculo?.anio ?? '—'}`,   315, y + 38)
       .text(`Placa: ${orden.vehiculo?.placa ?? '—'}`, 315, y + 51)
       .text(`Color: ${orden.vehiculo?.color ?? '—'}`, 315, y + 64)

    y += 105

    // ── Barra de info de la orden ───────────────────────────
    doc.rect(50, y, 495, 36).fillColor('#f1f5f9').fill()

    const fechaIngreso = new Date(orden.fechaIngreso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
       .text(`Ingreso: ${fechaIngreso}`,            62, y + 7)
       .text(`Mecánico: ${orden.mecanico?.nombre ?? 'Sin asignar'}`, 62, y + 20)
       .text(`Estado: ${orden.estado}`,             250, y + 7)
       .text(`Km: ${orden.kilometraje?.toLocaleString('es-MX') ?? 'N/A'}`, 250, y + 20)

    if (orden.fechaEntrega) {
      doc.text(
        `Entrega: ${new Date(orden.fechaEntrega).toLocaleDateString('es-MX', {
          day: '2-digit', month: 'short', year: 'numeric'
        })}`,
        400, y + 7
      )
    }
    y += 46

    // ── Diagnóstico / Falla ─────────────────────────────────
    if (orden.diagnostico) {
      doc.rect(50, y, 495, 4).fillColor('#f59e0b').fill()
      y += 8
      doc.fillColor('#92400e').fontSize(7.5).font('Helvetica-Bold')
         .text('DIAGNÓSTICO / FALLA REPORTADA', 50, y)
      y += 12
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
         .text(orden.diagnostico, 50, y, { width: 495 })
      y += doc.heightOfString(orden.diagnostico, { width: 495 }) + 12
    }

    // ── Servicios / Mano de obra ────────────────────────────
    if (orden.servicios.length > 0) {
      y += 4
      doc.rect(50, y, 495, 22).fillColor('#1e40af').fill()
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
         .text('SERVICIOS / MANO DE OBRA', 60, y + 7)
         .text('CANT.', 335, y + 7)
         .text('PRECIO',  405, y + 7)
         .text('SUBTOTAL', 475, y + 7)
      y += 22

      orden.servicios.forEach((s, i) => {
        doc.rect(50, y, 495, 20).fillColor(i % 2 === 0 ? '#ffffff' : '#f8fafc').fill()
        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica')
           .text(s.servicio?.nombre ?? '—',  60, y + 6, { width: 265 })
           .text(String(s.cantidad),          335, y + 6)
           .text(fmt(s.precioUnitario),        405, y + 6)
           .text(fmt(s.subtotal),              475, y + 6)
        y += 20
      })
      y += 4
    }

    // ── Refacciones ─────────────────────────────────────────
    if (orden.detalle.length > 0) {
      y += 4
      doc.rect(50, y, 495, 22).fillColor('#065f46').fill()
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
         .text('REFACCIONES UTILIZADAS', 60, y + 7)
         .text('CANT.', 335, y + 7)
         .text('PRECIO',  405, y + 7)
         .text('TOTAL',   475, y + 7)
      y += 22

      orden.detalle.forEach((d, i) => {
        doc.rect(50, y, 495, 20).fillColor(i % 2 === 0 ? '#ffffff' : '#f0fdf4').fill()
        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica')
           .text(d.refaccion?.nombre ?? '—', 60, y + 6, { width: 265 })
           .text(String(d.cantidad),          335, y + 6)
           .text(fmt(d.precioUnitario),        405, y + 6)
           .text(fmt(d.subtotal),              475, y + 6)
        y += 20
      })
      y += 4
    }

    // ── Totales ─────────────────────────────────────────────
    linea(doc, y + 6)
    y += 16

    doc.fillColor('#475569').fontSize(9).font('Helvetica')
       .text('Mano de obra:', 370, y)
       .text(fmt(orden.totalManoObra), 475, y)
    y += 15
    doc.text('Refacciones:', 370, y)
       .text(fmt(orden.totalRefacciones), 475, y)
    y += 18

    // Total general
    doc.rect(360, y, 185, 28).fillColor('#0f172a').fill()
    doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold')
       .text('TOTAL:', 370, y + 8)
       .text(fmt(orden.total), 465, y + 8)
    y += 38

    // Saldo pendiente / pagado
    if (Number(orden.saldoPendiente) > 0) {
      doc.rect(360, y, 185, 24).fillColor('#fee2e2').fill()
      doc.fillColor('#dc2626').fontSize(10).font('Helvetica-Bold')
         .text('SALDO PENDIENTE:', 370, y + 7)
         .text(fmt(orden.saldoPendiente), 462, y + 7)
    } else {
      doc.rect(360, y, 185, 24).fillColor('#dcfce7').fill()
      doc.fillColor('#16a34a').fontSize(10).font('Helvetica-Bold')
         .text('PAGADO COMPLETO', 385, y + 7)
    }
    y += 34

    // ── Historial de pagos ──────────────────────────────────
    if (orden.pagos.length > 0) {
      y += 8
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
         .text('PAGOS REGISTRADOS', 50, y)
      y += 12
      linea(doc, y, '#e2e8f0')
      y += 6

      orden.pagos.forEach(p => {
        doc.fillColor('#475569').fontSize(8).font('Helvetica')
           .text(
             `${new Date(p.fecha).toLocaleDateString('es-MX')}  ·  ${p.tipo}${p.notas ? '  —  ' + p.notas : ''}`,
             60, y, { width: 340 }
           )
           .text(fmt(p.monto), 450, y, { align: 'right', width: 90 })
        y += 13
      })
    }

    // ── Observaciones ───────────────────────────────────────
    if (orden.observaciones) {
      y += 8
      linea(doc, y)
      y += 10
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
         .text('OBSERVACIONES:', 50, y)
      y += 12
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
         .text(orden.observaciones, 50, y, { width: 495 })
      y += 22
    }

    // ── Firma ───────────────────────────────────────────────
    y += 10
    linea(doc, y)
    y += 20

    doc.moveTo(60, y + 30).lineTo(240, y + 30).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
    doc.moveTo(310, y + 30).lineTo(490, y + 30).strokeColor('#cbd5e1').lineWidth(0.5).stroke()

    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
       .text('Firma del cliente', 60, y + 35, { width: 180, align: 'center' })
       .text('Firma del taller', 310, y + 35, { width: 180, align: 'center' })

    // ── QR historial del vehículo ──────────────────────────
    y += 30
    try {
      const placa      = orden.vehiculo?.placa ?? ''
      const frontUrl   = process.env.FRONTEND_URL ?? 'https://refaccionaria-sistema.vercel.app'
      const historialUrl = `${frontUrl}/historial/${placa}`
      const qrBuffer   = await QRCode.toBuffer(historialUrl, {
        type:   'png',
        width:  80,
        margin: 1,
        color:  { dark: '#1e293b', light: '#ffffff' },
      })
      const qrX = 460
      doc.image(qrBuffer, qrX, y, { width: 55, height: 55 })
      doc.fillColor('#64748b').fontSize(6.5).font('Helvetica')
         .text('Escanea para ver', qrX - 2, y + 57, { width: 59, align: 'center' })
         .text('el historial del auto', qrX - 2, y + 65, { width: 59, align: 'center' })
    } catch { /* sin QR si hay error */ }

    // ── Pie de página ───────────────────────────────────────
    y += 55
    linea(doc, y)
    y += 8

    const infoNegocio = [negocio.telefono, negocio.ciudad].filter(Boolean).join('  ·  ')
    doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
       .text(
         `${negocio.nombre}${infoNegocio ? '  ·  ' + infoNegocio : ''}`,
         50, y, { align: 'center', width: 495 }
       )
    doc.text(
      'Gracias por su preferencia  ·  Conserve este documento como comprobante',
      50, y + 11,
      { align: 'center', width: 495 }
    )

    doc.end()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ mensaje: 'Error generando PDF', error })
  }
}

// ── PDF de Cotización ─────────────────────────────────────────
export const pdfCotizacion = async (req: Request, res: Response) => {
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where:   { id: req.params.id as string },
      include: {
        cliente:   true,
        vehiculo:  true,
        creadoPor: { select: { nombre: true } },
        items: {
          include: {
            refaccion: { select: { nombre: true } },
            servicio:  { select: { nombre: true } }
          }
        }
      }
    })

    if (!cotizacion) return res.status(404).json({ mensaje: 'Cotización no encontrada' })

    const negocio = await getNegocio()

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="cotizacion-${cotizacion.numero}.pdf"`)
    doc.pipe(res)

    let y = encabezado(doc, 'COTIZACIÓN', `#COT-${cotizacion.numero}`, negocio)

    // ── Aviso de cotización ─────────────────────────────────
    doc.rect(50, y, 495, 28).fillColor('#fef9c3').fill()
    doc.rect(50, y, 4, 28).fillColor('#eab308').fill()
    doc.fillColor('#713f12').fontSize(8.5).font('Helvetica-Bold')
       .text('PRESUPUESTO — NO ES UN COMPROBANTE DE PAGO', 62, y + 5)
    doc.fillColor('#854d0e').fontSize(8).font('Helvetica')
       .text('Los precios son estimados y pueden variar al momento del servicio.', 62, y + 16)
    y += 38

    // ── Bloques cliente / vehículo ──────────────────────────
    doc.rect(50, y, 240, 80).fillColor('#f8fafc').fill()
    doc.rect(305, y, 240, 80).fillColor('#f8fafc').fill()

    doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('CLIENTE', 60, y + 10)
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
       .text(cotizacion.cliente?.nombre ?? '—', 60, y + 22, { width: 220 })
    doc.fillColor('#475569').fontSize(9).font('Helvetica')
       .text(`Tel: ${cotizacion.cliente?.telefono ?? 'N/A'}`, 60, y + 38)
    if (cotizacion.cliente?.email)
      doc.text(cotizacion.cliente.email, 60, y + 51)

    if (cotizacion.vehiculo) {
      doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('VEHÍCULO', 315, y + 10)
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold')
         .text(`${cotizacion.vehiculo.marca} ${cotizacion.vehiculo.modelo}`, 315, y + 22)
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
         .text(`Placa: ${cotizacion.vehiculo.placa}`, 315, y + 38)
      if (cotizacion.vehiculo.anio)
        doc.text(`Año: ${cotizacion.vehiculo.anio}`, 315, y + 51)
    } else {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica')
         .text('Sin vehículo especificado', 315, y + 32)
    }

    y += 90

    // ── Info de validez ─────────────────────────────────────
    doc.rect(50, y, 495, 30).fillColor('#f1f5f9').fill()
    const fechaCot = new Date(cotizacion.createdAt).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
       .text(`Fecha: ${fechaCot}`, 62, y + 11)
       .text(`Elaboró: ${cotizacion.creadoPor?.nombre ?? '—'}`, 250, y + 11)

    if (cotizacion.validaHasta) {
      const vencimiento = new Date(cotizacion.validaHasta).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric'
      })
      doc.fillColor(new Date(cotizacion.validaHasta) < new Date() ? '#dc2626' : '#16a34a')
         .fontSize(8.5)
         .text(`Válida hasta: ${vencimiento}`, 400, y + 11, { align: 'right', width: 135 })
    }
    y += 42

    // ── Tabla de ítems ──────────────────────────────────────
    doc.rect(50, y, 495, 22).fillColor('#1e293b').fill()
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
       .text('DESCRIPCIÓN',  60,  y + 7)
       .text('CANT.',        335, y + 7)
       .text('P. UNIT.',     395, y + 7)
       .text('SUBTOTAL',     465, y + 7)
    y += 22

    cotizacion.items.forEach((item, i) => {
      const altura = 22
      doc.rect(50, y, 495, altura).fillColor(i % 2 === 0 ? '#ffffff' : '#f9fafb').fill()

      const nombre = item.refaccion?.nombre || item.servicio?.nombre || item.descripcion

      // Badge de tipo
      const tipoBadge = item.refaccion ? { texto: 'PIEZA', color: '#065f46', bg: '#d1fae5' }
                      : item.servicio  ? { texto: 'SERV',  color: '#1e40af', bg: '#dbeafe' }
                      :                  { texto: 'OTRO',  color: '#6b7280', bg: '#f3f4f6' }

      doc.rect(59, y + 5, 28, 12).fillColor(tipoBadge.bg).fill()
      doc.fillColor(tipoBadge.color).fontSize(6).font('Helvetica-Bold')
         .text(tipoBadge.texto, 59, y + 8, { width: 28, align: 'center' })

      doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica')
         .text(nombre,                  92,  y + 7, { width: 235 })
         .text(String(item.cantidad),   335, y + 7)
         .text(fmt(item.precioUnitario), 395, y + 7)
         .text(fmt(item.subtotal),       465, y + 7)
      y += altura
    })

    // ── Totales ─────────────────────────────────────────────
    linea(doc, y + 6)
    y += 20

    doc.rect(360, y, 185, 30).fillColor('#0f172a').fill()
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
       .text('TOTAL:', 370, y + 9)
       .text(fmt(cotizacion.total), 455, y + 9)
    y += 46

    // ── Notas ───────────────────────────────────────────────
    if (cotizacion.notas) {
      doc.rect(50, y, 495, 4).fillColor('#3b82f6').fill()
      y += 10
      doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold')
         .text('NOTAS:', 50, y)
      y += 12
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
         .text(cotizacion.notas, 50, y, { width: 495 })
      y += doc.heightOfString(cotizacion.notas, { width: 495 }) + 14
    }

    // ── Aceptación del cliente ──────────────────────────────
    y += 10
    linea(doc, y)
    y += 20

    doc.moveTo(60, y + 30).lineTo(250, y + 30).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
       .text('Firma de aceptación del cliente', 60, y + 35, { width: 190, align: 'center' })
    doc.fillColor('#94a3b8').fontSize(7.5)
       .text('Al firmar acepta el presupuesto presentado', 60, y + 46, { width: 190, align: 'center' })

    // Sello del taller
    doc.circle(450, y + 22, 28).strokeColor('#e2e8f0').lineWidth(1).stroke()
    doc.fillColor('#e2e8f0').fontSize(8).font('Helvetica-Bold')
       .text('SELLO', 422, y + 18, { width: 56, align: 'center' })
    doc.fillColor('#e2e8f0').fontSize(7).font('Helvetica')
       .text('DEL TALLER', 422, y + 28, { width: 56, align: 'center' })

    // ── Pie de página ───────────────────────────────────────
    y += 70
    linea(doc, y)
    y += 8

    const infoNeg = [negocio.telefono, negocio.ciudad].filter(Boolean).join('  ·  ')
    doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
       .text(
         `${negocio.nombre}${infoNeg ? '  ·  ' + infoNeg : ''}`,
         50, y, { align: 'center', width: 495 }
       )
    doc.text(
      'Este presupuesto es orientativo y tiene validez según la fecha indicada  ·  Gracias por su confianza',
      50, y + 11,
      { align: 'center', width: 495 }
    )

    doc.end()
  } catch (error) {
    console.error(error)
    return res.status(500).json({ mensaje: 'Error generando PDF', error })
  }
}

// ── Generar mensaje de WhatsApp ───────────────────────────────
export const mensajeWhatsApp = async (req: Request, res: Response) => {
  try {
    const { tipo } = req.query
    const negocio  = await getNegocio()

    if (tipo === 'listo') {
      const orden = await prisma.ordenTrabajo.findUnique({
        where:   { id: req.params.id as string },
        include: {
          cliente:  { select: { nombre: true, telefono: true } },
          vehiculo: { select: { marca: true, modelo: true, placa: true } }
        }
      })
      if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' })

      const tel    = orden.cliente?.telefono?.replace(/\D/g, '')
      const nombre = orden.cliente?.nombre
      const auto   = `${orden.vehiculo?.marca} ${orden.vehiculo?.modelo}`
      const placa  = orden.vehiculo?.placa
      const total  = fmt(orden.total)
      const saldo  = Number(orden.saldoPendiente)

      const mensaje = saldo > 0
        ? `Hola ${nombre} 👋\n\nTe informamos que tu *${auto}* (${placa}) ya está *listo para recoger* 🔧✅\n\n*Total del servicio:* ${total}\n*Saldo pendiente:* ${fmt(saldo)}\n\nTe esperamos. ¡Gracias por tu preferencia!\n\n_${negocio.nombre}_ ${negocio.telefono ? '· ' + negocio.telefono : ''}`
        : `Hola ${nombre} 👋\n\nTe informamos que tu *${auto}* (${placa}) ya está *listo para recoger* 🔧✅\n\n*Total:* ${total} ✓ _Pagado_\n\nTe esperamos. ¡Gracias por tu preferencia!\n\n_${negocio.nombre}_ ${negocio.telefono ? '· ' + negocio.telefono : ''}`

      return res.json({
        telefono: tel,
        mensaje,
        url: `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`
      })
    }

    if (tipo === 'deuda') {
      const orden = await prisma.ordenTrabajo.findUnique({
        where:   { id: req.params.id as string },
        include: {
          cliente:  { select: { nombre: true, telefono: true } },
          vehiculo: { select: { marca: true, modelo: true } }
        }
      })
      if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' })

      const tel    = orden.cliente?.telefono?.replace(/\D/g, '')
      const nombre = orden.cliente?.nombre
      const auto   = `${orden.vehiculo?.marca} ${orden.vehiculo?.modelo}`
      const saldo  = fmt(orden.saldoPendiente)

      const mensaje = `Hola ${nombre} 👋\n\nTe recordamos que tienes un saldo pendiente de *${saldo}* por el servicio de tu *${auto}*.\n\nCualquier duda estamos para atenderte. ¡Gracias!\n\n_${negocio.nombre}_ ${negocio.telefono ? '· ' + negocio.telefono : ''}`

      return res.json({
        telefono: tel,
        mensaje,
        url: `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`
      })
    }

    if (tipo === 'cotizacion') {
      const cot = await prisma.cotizacion.findUnique({
        where:   { id: req.params.id as string },
        include: {
          cliente:  { select: { nombre: true, telefono: true } },
          vehiculo: { select: { marca: true, modelo: true } }
        }
      })
      if (!cot) return res.status(404).json({ mensaje: 'Cotización no encontrada' })

      const tel    = cot.cliente?.telefono?.replace(/\D/g, '')
      const nombre = cot.cliente?.nombre
      const total  = fmt(cot.total)
      const auto   = cot.vehiculo
        ? ` para tu *${cot.vehiculo.marca} ${cot.vehiculo.modelo}*` : ''

      const validez = cot.validaHasta
        ? `\n📅 Válida hasta: ${new Date(cot.validaHasta).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`
        : ''

      const mensaje =
        `Hola ${nombre} 👋\n\nTe enviamos el presupuesto *#COT-${cot.numero}*${auto} por un total de *${total}*.${validez}\n\n${cot.notas ? '📝 ' + cot.notas + '\n\n' : ''}¿Deseas que procedamos? Con gusto te atendemos. ✅\n\n_${negocio.nombre}_ ${negocio.telefono ? '· ' + negocio.telefono : ''}`

      return res.json({
        telefono: tel,
        mensaje,
        url: `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`
      })
    }

    return res.status(400).json({ mensaje: 'Tipo inválido. Usa: listo, deuda o cotizacion' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error generando mensaje', error })
  }
}
