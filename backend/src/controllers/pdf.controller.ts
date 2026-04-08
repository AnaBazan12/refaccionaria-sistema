import { Request, Response } from 'express'
import PDFDocument           from 'pdfkit'
import {prisma}                from '../utils/prisma'

// ── Helper: formato de moneda ─────────────────────────────────
const fmt = (n: any) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

// ── Helper: dibujar línea separadora ─────────────────────────
const linea = (doc: PDFKit.PDFDocument, y: number) => {
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke()
}

// ── Helper: encabezado del negocio ────────────────────────────
const encabezado = (
  doc:    PDFKit.PDFDocument,
  titulo: string,
  numero: string
) => {
  // Fondo del encabezado
  doc.rect(0, 0, 595, 80).fill('#1e293b')

  // Nombre del negocio
  doc.fillColor('#ffffff')
     .fontSize(20)
     .font('Helvetica-Bold')
     .text('REFACCIONARIA & TALLER', 50, 22)

  doc.fillColor('#94a3b8')
     .fontSize(9)
     .font('Helvetica')
     .text('Servicio mecánico profesional', 50, 46)

  // Título y número
  doc.fillColor('#60a5fa')
     .fontSize(11)
     .font('Helvetica-Bold')
     .text(titulo, 350, 22, { align: 'right', width: 195 })

  doc.fillColor('#ffffff')
     .fontSize(18)
     .text(numero, 350, 38, { align: 'right', width: 195 })

  doc.fillColor('#000000')
  return 100 // y inicial después del encabezado
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
        servicios: {
          include: { servicio: true }
        },
        detalle: {
          include: { refaccion: true }
        },
        pagos: true
      }
    })

    if (!orden) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' })
    }

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })

    // Headers de respuesta
    res.setHeader('Content-Type',        'application/pdf')
    res.setHeader('Content-Disposition',
      `inline; filename="orden-${orden.numero}.pdf"`)
    doc.pipe(res)

    let y = encabezado(doc, 'ORDEN DE TRABAJO', `#${orden.numero}`)

    // ── Información del cliente y vehículo ──────────────────
    doc.rect(50, y, 240, 90).fillColor('#f8fafc').fill()
    doc.rect(305, y, 240, 90).fillColor('#f8fafc').fill()

    // Datos cliente
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
       .text('CLIENTE', 60, y + 10)
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold')
       .text(orden.cliente?.nombre ?? '—', 60, y + 23)
    doc.fillColor('#475569').fontSize(9).font('Helvetica')
       .text(`Tel: ${orden.cliente?.telefono ?? 'N/A'}`, 60, y + 38)
    doc.text(orden.cliente?.email ?? '', 60, y + 51)
    if (orden.cliente?.direccion) {
      doc.text(orden.cliente.direccion, 60, y + 64, { width: 220 })
    }

    // Datos vehículo
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
       .text('VEHÍCULO', 315, y + 10)
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold')
       .text(
         `${orden.vehiculo?.marca} ${orden.vehiculo?.modelo}`,
         315, y + 23
       )
    doc.fillColor('#475569').fontSize(9).font('Helvetica')
       .text(`Año: ${orden.vehiculo?.anio}`, 315, y + 38)
       .text(`Placa: ${orden.vehiculo?.placa}`, 315, y + 51)
       .text(`Color: ${orden.vehiculo?.color ?? 'N/A'}`, 315, y + 64)

    y += 100

    // ── Info de la orden ────────────────────────────────────
    doc.rect(50, y, 495, 40).fillColor('#f1f5f9').fill()

    const fechaIngreso = new Date(orden.fechaIngreso)
      .toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric'
      })

    doc.fillColor('#475569').fontSize(8).font('Helvetica')
    doc.text(`Fecha ingreso: ${fechaIngreso}`,     60, y + 8)
    doc.text(`Mecánico: ${orden.mecanico?.nombre ?? 'Sin asignar'}`, 60, y + 22)
    doc.text(`Estado: ${orden.estado}`,            250, y + 8)
    doc.text(`Km: ${orden.kilometraje?.toLocaleString('es-MX') ?? 'N/A'}`,
             250, y + 22)

    if (orden.fechaEntrega) {
      const fechaEnt = new Date(orden.fechaEntrega)
        .toLocaleDateString('es-MX', {
          day: '2-digit', month: 'long', year: 'numeric'
        })
      doc.text(`Entrega: ${fechaEnt}`, 400, y + 8)
    }

    y += 50

    // ── Diagnóstico ─────────────────────────────────────────
    if (orden.diagnostico) {
      doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold')
         .text('DIAGNÓSTICO / FALLA REPORTADA', 50, y)
      y += 12
      doc.rect(50, y, 495, 1).fillColor('#fcd34d').fill()
      y += 6
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
         .text(orden.diagnostico, 50, y, { width: 495 })
      y += doc.heightOfString(orden.diagnostico, { width: 495 }) + 10
    }

    // ── Servicios de mano de obra ───────────────────────────
    if (orden.servicios.length > 0) {
      y += 5
      doc.rect(50, y, 495, 22).fillColor('#1e40af').fill()
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
         .text('SERVICIOS / MANO DE OBRA', 60, y + 7)
         .text('CANTIDAD', 330, y + 7)
         .text('PRECIO',   420, y + 7)
         .text('SUBTOTAL', 480, y + 7)
      y += 22

      orden.servicios.forEach((s, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
        doc.rect(50, y, 495, 20).fillColor(bg).fill()
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
           .text(s.servicio?.nombre ?? '—',       60, y + 6, { width: 260 })
           .text(String(s.cantidad),               330, y + 6)
           .text(fmt(s.precioUnitario),             400, y + 6)
           .text(fmt(s.subtotal),                   480, y + 6)
        y += 20
      })
      y += 5
    }

    // ── Refacciones utilizadas ──────────────────────────────
    if (orden.detalle.length > 0) {
      y += 5
      doc.rect(50, y, 495, 22).fillColor('#065f46').fill()
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
         .text('REFACCIONES UTILIZADAS', 60, y + 7)
         .text('CANT.',   330, y + 7)
         .text('PRECIO',  400, y + 7)
         .text('TOTAL',   480, y + 7)
      y += 22

      orden.detalle.forEach((d, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f0fdf4'
        doc.rect(50, y, 495, 20).fillColor(bg).fill()
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
           .text(d.refaccion?.nombre ?? '—',  60, y + 6, { width: 260 })
           .text(String(d.cantidad),           330, y + 6)
           .text(fmt(d.precioUnitario),         400, y + 6)
           .text(fmt(d.subtotal),               480, y + 6)
        y += 20
      })
      y += 5
    }

    // ── Totales ─────────────────────────────────────────────
    linea(doc, y + 5)
    y += 15

    const totales = [
      { label: 'Mano de obra:',    valor: fmt(orden.totalManoObra)    },
      { label: 'Refacciones:',     valor: fmt(orden.totalRefacciones) },
    ]

    totales.forEach(t => {
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
         .text(t.label, 380, y)
         .text(t.valor,  480, y)
      y += 16
    })

    // Total general
    doc.rect(370, y, 175, 26).fillColor('#1e293b').fill()
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
       .text('TOTAL:', 380, y + 7)
       .text(fmt(orden.total), 470, y + 7)
    y += 36

    // Saldo pendiente
    if (Number(orden.saldoPendiente) > 0) {
      doc.rect(370, y, 175, 22).fillColor('#fee2e2').fill()
      doc.fillColor('#dc2626').fontSize(10).font('Helvetica-Bold')
         .text('SALDO PENDIENTE:', 380, y + 6)
         .text(fmt(orden.saldoPendiente), 470, y + 6)
      y += 28
    } else {
      doc.rect(370, y, 175, 22).fillColor('#dcfce7').fill()
      doc.fillColor('#16a34a').fontSize(10).font('Helvetica-Bold')
         .text('✓ PAGADO COMPLETO', 390, y + 6)
      y += 28
    }

    // ── Historial de pagos ──────────────────────────────────
    if (orden.pagos.length > 0) {
      y += 10
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
         .text('PAGOS REGISTRADOS', 50, y)
      y += 12

      orden.pagos.forEach(p => {
        doc.fillColor('#475569').fontSize(8).font('Helvetica')
           .text(
             `${new Date(p.fecha).toLocaleDateString('es-MX')} — ${p.tipo}:`,
             60, y
           )
           .text(fmt(p.monto), 400, y)
        y += 13
      })
      y += 5
    }

    // ── Observaciones ───────────────────────────────────────
    if (orden.observaciones) {
      y += 5
      linea(doc, y)
      y += 10
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
         .text('OBSERVACIONES:', 50, y)
      y += 12
      doc.fillColor('#475569').fontSize(8).font('Helvetica')
         .text(orden.observaciones, 50, y, { width: 495 })
      y += 20
    }

    // ── Pie de página ───────────────────────────────────────
    linea(doc, y + 10)
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
       .text(
         'Gracias por su preferencia · Conserve este documento como comprobante',
         50, y + 20,
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
        cliente:  true,
        vehiculo: true,
        creadoPor:{ select: { nombre: true } },
        items: {
          include: {
            refaccion: { select: { nombre: true } },
            servicio:  { select: { nombre: true } }
          }
        }
      }
    })

    if (!cotizacion) {
      return res.status(404).json({ mensaje: 'Cotización no encontrada' })
    }

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })

    res.setHeader('Content-Type',        'application/pdf')
    res.setHeader('Content-Disposition',
      `inline; filename="cotizacion-${cotizacion.numero}.pdf"`)
    doc.pipe(res)

    let y = encabezado(doc, 'COTIZACIÓN', `#COT-${cotizacion.numero}`)

    // ── Datos del cliente ───────────────────────────────────
    doc.rect(50, y, 495, 70).fillColor('#f8fafc').fill()
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
       .text('CLIENTE', 60, y + 10)
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold')
       .text(cotizacion.cliente?.nombre ?? '—', 60, y + 23)
    doc.fillColor('#475569').fontSize(9).font('Helvetica')
       .text(`Tel: ${cotizacion.cliente?.telefono ?? 'N/A'}`, 60, y + 40)

    if (cotizacion.vehiculo) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
         .text('VEHÍCULO', 300, y + 10)
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
         .text(
           `${cotizacion.vehiculo.marca} ${cotizacion.vehiculo.modelo}`,
           300, y + 23
         )
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
         .text(`Placa: ${cotizacion.vehiculo.placa}`, 300, y + 40)
    }

    y += 80

    // ── Info cotización ─────────────────────────────────────
    doc.rect(50, y, 495, 30).fillColor('#fef3c7').fill()
    doc.fillColor('#92400e').fontSize(9).font('Helvetica')
       .text(
         `Fecha: ${new Date(cotizacion.createdAt)
           .toLocaleDateString('es-MX', {
             day: '2-digit', month: 'long', year: 'numeric'
           })}`,
         60, y + 10
       )
    if (cotizacion.validaHasta) {
      doc.text(
        `Válida hasta: ${new Date(cotizacion.validaHasta)
          .toLocaleDateString('es-MX', {
            day: '2-digit', month: 'long', year: 'numeric'
          })}`,
        280, y + 10
      )
    }
    y += 40

    // ── Tabla de items ──────────────────────────────────────
    doc.rect(50, y, 495, 22).fillColor('#374151').fill()
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
       .text('DESCRIPCIÓN',   60,  y + 7)
       .text('CANTIDAD',      330, y + 7)
       .text('P. UNITARIO',   390, y + 7)
       .text('SUBTOTAL',      470, y + 7)
    y += 22

    cotizacion.items.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb'
      doc.rect(50, y, 495, 22).fillColor(bg).fill()

      const nombre = item.refaccion?.nombre
        || item.servicio?.nombre
        || item.descripcion

      doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
         .text(nombre, 60, y + 7, { width: 260 })
         .text(String(item.cantidad),       330, y + 7)
         .text(fmt(item.precioUnitario),     390, y + 7)
         .text(fmt(item.subtotal),           470, y + 7)
      y += 22
    })

    // ── Total ───────────────────────────────────────────────
    linea(doc, y + 5)
    y += 15
    doc.rect(370, y, 175, 28).fillColor('#1e293b').fill()
    doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold')
       .text('TOTAL:', 380, y + 8)
       .text(fmt(cotizacion.total), 460, y + 8)
    y += 45

    // ── Notas ───────────────────────────────────────────────
    if (cotizacion.notas) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
         .text('NOTAS:', 50, y)
      y += 14
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
         .text(cotizacion.notas, 50, y, { width: 495 })
      y += 20
    }

    // ── Pie ─────────────────────────────────────────────────
    linea(doc, y + 10)
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
       .text(
         'Esta cotización es un presupuesto estimado · Los precios pueden variar',
         50, y + 20,
         { align: 'center', width: 495 }
       )
       .text(
         'Gracias por contactarnos · Estamos para servirle',
         50, y + 32,
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
    // tipo: 'listo' | 'deuda' | 'cotizacion'

    if (tipo === 'listo') {
      // Auto listo para recoger
      const orden = await prisma.ordenTrabajo.findUnique({
        where:   { id: req.params.id as string},
        include: {
          cliente:  { select: { nombre: true, telefono: true } },
          vehiculo: { select: { marca: true, modelo: true, placa: true } }
        }
      })
      if (!orden) {
        return res.status(404).json({ mensaje: 'Orden no encontrada' })
      }

      const tel     = orden.cliente?.telefono?.replace(/\D/g, '')
      const nombre  = orden.cliente?.nombre
      const auto    = `${orden.vehiculo?.marca} ${orden.vehiculo?.modelo}`
      const placa   = orden.vehiculo?.placa
      const total   = fmt(orden.total)
      const saldo   = Number(orden.saldoPendiente)

      const mensaje = saldo > 0
        ? `Hola ${nombre} 👋\n\nTe informamos que tu *${auto}* (${placa}) ya está listo para recoger. 🔧✅\n\n*Total del servicio:* ${total}\n*Saldo pendiente:* ${fmt(saldo)}\n\nTe esperamos. ¡Gracias por tu preferencia!`
        : `Hola ${nombre} 👋\n\nTe informamos que tu *${auto}* (${placa}) ya está listo para recoger. 🔧✅\n\n*Total:* ${total} *(Pagado)*\n\nTe esperamos. ¡Gracias por tu preferencia!`

      return res.json({
        telefono: tel,
        mensaje,
        url: `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`
      })
    }

    if (tipo === 'deuda') {
      // Recordatorio de deuda
      const orden = await prisma.ordenTrabajo.findUnique({
        where:   { id: req.params.id as string},
        include: {
          cliente:  { select: { nombre: true, telefono: true } },
          vehiculo: { select: { marca: true, modelo: true } }
        }
      })
      if (!orden) {
        return res.status(404).json({ mensaje: 'Orden no encontrada' })
      }

      const tel    = orden.cliente?.telefono?.replace(/\D/g, '')
      const nombre = orden.cliente?.nombre
      const auto   = `${orden.vehiculo?.marca} ${orden.vehiculo?.modelo}`
      const saldo  = fmt(orden.saldoPendiente)

      const mensaje =
        `Hola ${nombre} 👋\n\nTe recordamos que tienes un saldo pendiente de *${saldo}* por el servicio de tu *${auto}*.\n\nCualquier duda estamos a tus órdenes. ¡Gracias!`

      return res.json({
        telefono: tel,
        mensaje,
        url: `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`
      })
    }

    if (tipo === 'cotizacion') {
      // Enviar cotización
      const cot = await prisma.cotizacion.findUnique({
        where:   { id: req.params.id as string },
        include: {
          cliente: { select: { nombre: true, telefono: true } }
        }
      })
      if (!cot) {
        return res.status(404).json({ mensaje: 'Cotización no encontrada' })
      }

      const tel    = cot.cliente?.telefono?.replace(/\D/g, '')
      const nombre = cot.cliente?.nombre
      const total  = fmt(cot.total)

      const mensaje =
        `Hola ${nombre} 👋\n\nTe enviamos el presupuesto #COT-${cot.numero} por un total de *${total}*.\n\n${cot.notas ? cot.notas + '\n\n' : ''}¿Tienes alguna duda? Con gusto te atendemos. ¡Gracias!`

      return res.json({
        telefono: tel,
        mensaje,
        url: `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`
      })
    }

    return res.status(400).json({
      mensaje: 'Tipo inválido. Usa: listo, deuda o cotizacion'
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error generando mensaje', error })
  }
}