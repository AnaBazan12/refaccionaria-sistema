import { Request, Response } from 'express'
import PDFDocument            from 'pdfkit'
import { prisma }             from '../utils/prisma'

// ── Datos del negocio (desde BD, con fallback a env) ─────────
type NegocioInfo = {
  nombre:    string
  subtitulo: string
  telefono:  string
  direccion: string
  ciudad:    string
  logo?:     string | null
}

async function getNegocio(): Promise<NegocioInfo> {
  try {
    const cfg = await prisma.configNegocio.findUnique({ where: { id: 'singleton' } })
    if (cfg) return cfg
  } catch { /* si falla la BD usamos env */ }
  return {
    nombre:    process.env.NEGOCIO_NOMBRE    ?? 'REFACCIONARIA & TALLER',
    subtitulo: process.env.NEGOCIO_SUBTITULO ?? 'Servicio mecánico profesional',
    telefono:  process.env.NEGOCIO_TELEFONO  ?? '',
    direccion: process.env.NEGOCIO_DIRECCION ?? '',
    ciudad:    process.env.NEGOCIO_CIUDAD    ?? '',
  }
}

// ── Helpers ───────────────────────────────────────────────────
const fmtMXN = (n: any) =>
  `$${Number(n ?? 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`

const hrule = (doc: PDFKit.PDFDocument, y: number, color = '#e5e7eb') => {
  doc.moveTo(40, y).lineTo(555, y).strokeColor(color).lineWidth(0.8).stroke()
}

/** Dibuja el encabezado oscuro estándar y devuelve la Y donde continuar */
const header = (doc: PDFKit.PDFDocument, titulo: string, subtitulo: string, negocio: NegocioInfo): number => {
  const h = 86
  doc.rect(0, 0, 595, h).fillColor('#0f172a').fill()

  // — Logo (cuadrado redondeado) —
  let logoRendered = false
  if (negocio.logo) {
    try {
      const buf = Buffer.from(negocio.logo, 'base64')
      doc.save()
      doc.roundedRect(28, 17, 50, 50, 7).clip()
      doc.image(buf, 28, 17, { fit: [50, 50], align: 'center', valign: 'center' })
      doc.restore()
      logoRendered = true
    } catch { /* cae al vectorial */ }
  }
  if (!logoRendered) {
    doc.roundedRect(28, 17, 50, 50, 7).fillColor('#1d4ed8').fill()
    doc.rect(28, 57, 50, 10).fillColor('#1e3a8a').fill()
    doc.circle(53, 39, 16).fillColor('#2563eb').fill()
    doc.fillColor('#fff').fontSize(20).font('Helvetica-Bold')
       .text(negocio.nombre.charAt(0), 28, 22, { width: 50, align: 'center' })
    doc.fillColor('#93c5fd').fontSize(6.5).font('Helvetica')
       .text('TALLER', 28, 58, { width: 50, align: 'center' })
  }

  // — Nombre del negocio —
  doc.fillColor('#fff').fontSize(15).font('Helvetica-Bold')
     .text(negocio.nombre, 90, 20, { width: 280 })
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
     .text(negocio.subtitulo, 90, 40)
  let iy = 52
  if (negocio.telefono) {
    doc.fillColor('#64748b').fontSize(7)
       .text(`Tel: ${negocio.telefono}`, 90, iy)
    iy += 10
  }
  if (negocio.ciudad || negocio.direccion) {
    doc.fillColor('#64748b').fontSize(7)
       .text([negocio.direccion, negocio.ciudad].filter(Boolean).join(', '), 90, iy)
  }

  // — Título del reporte —
  doc.moveTo(385, 12).lineTo(385, h - 12).strokeColor('#1e293b').lineWidth(1).stroke()
  doc.fillColor('#60a5fa').fontSize(8.5).font('Helvetica-Bold')
     .text(titulo, 392, 20, { align: 'right', width: 155 })
  doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold')
     .text(subtitulo, 392, 34, { align: 'right', width: 155 })
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
     .text(`Emitido: ${new Date().toLocaleDateString('es-MX', {
       day: '2-digit', month: 'short', year: 'numeric',
       hour: '2-digit', minute: '2-digit'
     })}`, 392, 58, { align: 'right', width: 155 })

  doc.fillColor('#000')
  return h + 14
}

/** Dibuja el título de sección con fondo azul oscuro */
const secTitle = (doc: PDFKit.PDFDocument, y: number, text: string, color = '#1e3a8a'): number => {
  doc.rect(40, y, 515, 20).fillColor(color).fill()
  doc.fillColor('#fff').fontSize(8.5).font('Helvetica-Bold')
     .text(text, 48, y + 6)
  return y + 24
}

/** Tarjetas de métricas en fila */
const metricRow = (
  doc: PDFKit.PDFDocument,
  y: number,
  items: { label: string; value: string; bg?: string; fg?: string }[]
): number => {
  const w  = Math.floor(515 / items.length)
  items.forEach((item, i) => {
    const x = 40 + i * w
    doc.rect(x, y, w - 4, 44)
       .fillColor(item.bg ?? '#f8fafc').fill()
    doc.fillColor(item.fg ?? '#1e293b')
       .fontSize(14).font('Helvetica-Bold')
       .text(item.value, x + 6, y + 6, { width: w - 10 })
    doc.fillColor('#64748b').fontSize(7).font('Helvetica')
       .text(item.label, x + 6, y + 26, { width: w - 10 })
  })
  return y + 52
}

/** Encabezado de tabla */
const tableHead = (
  doc: PDFKit.PDFDocument,
  y:   number,
  cols: { text: string; x: number; w: number; align?: string }[]
): number => {
  doc.rect(40, y, 515, 18).fillColor('#334155').fill()
  cols.forEach(c => {
    doc.fillColor('#e2e8f0').fontSize(7.5).font('Helvetica-Bold')
       .text(c.text, c.x, y + 5, { width: c.w, align: (c.align as any) ?? 'left' })
  })
  return y + 18
}

/** Una fila de tabla */
const tableRow = (
  doc:    PDFKit.PDFDocument,
  y:      number,
  cols:   { text: string; x: number; w: number; align?: string }[],
  even:   boolean,
  height = 18
): number => {
  doc.rect(40, y, 515, height).fillColor(even ? '#f8fafc' : '#ffffff').fill()
  cols.forEach(c => {
    doc.fillColor('#1e293b').fontSize(8).font('Helvetica')
       .text(c.text, c.x, y + 4, { width: c.w, align: (c.align as any) ?? 'left' })
  })
  return y + height
}

/** Pie de tabla con totales */
const tableFoot = (
  doc:  PDFKit.PDFDocument,
  y:    number,
  cols: { text: string; x: number; w: number; align?: string }[]
): number => {
  doc.rect(40, y, 515, 20).fillColor('#e2e8f0').fill()
  cols.forEach(c => {
    doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold')
       .text(c.text, c.x, y + 6, { width: c.w, align: (c.align as any) ?? 'left' })
  })
  return y + 24
}

// ═══════════════════════════════════════════════════════════════
// PDF REPORTE DIARIO
// ═══════════════════════════════════════════════════════════════
export const pdfReporteDiario = async (req: Request, res: Response) => {
  try {
    const negocio = await getNegocio()

    const fecha = req.query.fecha
      ? new Date(req.query.fecha as string + 'T12:00:00')
      : new Date()

    const inicio = new Date(fecha); inicio.setHours(0, 0, 0, 0)
    const fin    = new Date(fecha); fin.setHours(23, 59, 59, 999)

    const [ventasRef, ordenesDelDia] = await Promise.all([
      prisma.ventaRefaccion.findMany({
        where:   { fecha: { gte: inicio, lte: fin } },
        include: { refaccion: { select: { nombre: true, codigo: true } }, usuario: { select: { nombre: true } } },
        orderBy: { fecha: 'asc' }
      }),
      prisma.ordenTrabajo.findMany({
        where:   { fechaEntrega: { gte: inicio, lte: fin }, estado: 'ENTREGADO' },
        include: {
          cliente:  { select: { nombre: true } },
          vehiculo: { select: { placa: true, marca: true, modelo: true } },
          mecanico: { select: { nombre: true } }
        },
        orderBy: { fechaEntrega: 'asc' }
      })
    ])

    const totalMostrador = ventasRef.filter(v => v.tipoVenta === 'MOSTRADOR').reduce((s, v) => s + Number(v.subtotal), 0)
    const totalTallerRef = ventasRef.filter(v => v.tipoVenta === 'TALLER').reduce((s, v) => s + Number(v.subtotal), 0)
    const totalMayoreo   = ventasRef.filter(v => v.tipoVenta === 'MAYOREO').reduce((s, v) => s + Number(v.subtotal), 0)
    const gananciaRef    = ventasRef.reduce((s, v) => s + Number(v.ganancia), 0)
    const totalManoObra  = ordenesDelDia.reduce((s, o) => s + Number(o.totalManoObra), 0)
    const totalTaller    = ordenesDelDia.reduce((s, o) => s + Number(o.total), 0)
    const granTotal      = totalMostrador + totalMayoreo + totalTaller

    const doc = new PDFDocument({ margin: 40, size: 'LETTER' })
    const fechaStr = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="reporte-diario-${inicio.toISOString().split('T')[0]}.pdf"`)
    doc.pipe(res)

    let y = header(doc, 'REPORTE DIARIO', fechaStr, negocio)

    // ── Métricas generales ────────────────────────────────────
    y = metricRow(doc, y, [
      { label: 'Total del día',         value: fmtMXN(granTotal),    bg: '#f0fdf4', fg: '#166534' },
      { label: 'Ganancia refacciones',  value: fmtMXN(gananciaRef),  bg: '#eff6ff', fg: '#1d4ed8' },
      { label: 'Mano de obra',          value: fmtMXN(totalManoObra), bg: '#faf5ff', fg: '#6b21a8' },
      { label: 'Autos entregados',      value: String(ordenesDelDia.length), bg: '#fff7ed', fg: '#c2410c' },
    ])
    y += 4

    // ── Ventas de refacciones ─────────────────────────────────
    if (ventasRef.length > 0) {
      y = secTitle(doc, y, '🏪  VENTAS DE REFACCIONES')

      // Sub-totales por tipo
      y = metricRow(doc, y, [
        { label: 'Mostrador', value: fmtMXN(totalMostrador), bg: '#eff6ff', fg: '#1d4ed8' },
        { label: 'Taller',    value: fmtMXN(totalTallerRef), bg: '#faf5ff', fg: '#6b21a8' },
        { label: 'Mayoreo',   value: fmtMXN(totalMayoreo),   bg: '#fffbeb', fg: '#92400e' },
        { label: 'Ganancia',  value: fmtMXN(gananciaRef),    bg: '#f0fdf4', fg: '#166534' },
      ])
      y += 4

      // Tabla
      const cols = [
        { text: 'REFACCIÓN',  x: 48,  w: 180 },
        { text: 'CÓD.',       x: 232, w: 60  },
        { text: 'TIPO',       x: 296, w: 65  },
        { text: 'CANT.',      x: 364, w: 35, align: 'center' },
        { text: 'PRECIO',     x: 402, w: 70, align: 'right'  },
        { text: 'SUBTOTAL',   x: 475, w: 70, align: 'right'  },
      ]
      y = tableHead(doc, y, cols)

      let totalVentasF = 0
      ventasRef.forEach((v, i) => {
        if (y > 700) { doc.addPage(); y = 40 }
        const tipo = v.tipoVenta === 'MOSTRADOR' ? 'Mostrador' : v.tipoVenta === 'TALLER' ? 'Taller' : 'Mayoreo'
        y = tableRow(doc, y, [
          { text: v.refaccion.nombre, x: 48,  w: 180 },
          { text: v.refaccion.codigo, x: 232, w: 60  },
          { text: tipo,               x: 296, w: 65  },
          { text: String(v.cantidad), x: 364, w: 35, align: 'center' },
          { text: fmtMXN(v.precioUnitario), x: 402, w: 70, align: 'right' },
          { text: fmtMXN(v.subtotal),       x: 475, w: 70, align: 'right' },
        ], i % 2 === 0)
        totalVentasF += Number(v.subtotal)
      })

      y = tableFoot(doc, y, [
        { text: `${ventasRef.length} ventas`, x: 48,  w: 300 },
        { text: 'TOTAL',                       x: 402, w: 70, align: 'right' },
        { text: fmtMXN(totalVentasF),          x: 475, w: 70, align: 'right' },
      ])
      y += 8
    }

    // ── Órdenes del taller entregadas ─────────────────────────
    if (ordenesDelDia.length > 0) {
      if (y > 620) { doc.addPage(); y = 40 }
      y = secTitle(doc, y, '🔧  TALLER — ÓRDENES ENTREGADAS', '#065f46')
      y = metricRow(doc, y, [
        { label: 'Órdenes entregadas', value: String(ordenesDelDia.length), bg: '#eff6ff', fg: '#1e40af' },
        { label: 'Total taller',       value: fmtMXN(totalTaller),          bg: '#f0fdf4', fg: '#166534' },
        { label: 'Mano de obra',       value: fmtMXN(totalManoObra),        bg: '#faf5ff', fg: '#6b21a8' },
      ])
      y += 4

      const cols = [
        { text: 'CLIENTE',       x: 48,  w: 145 },
        { text: 'VEHÍCULO',      x: 197, w: 130 },
        { text: 'MECÁNICO',      x: 331, w: 100 },
        { text: 'MANO OBRA',     x: 435, w: 70, align: 'right' },
        { text: 'TOTAL',         x: 508, w: 40, align: 'right' },
      ]
      y = tableHead(doc, y, cols)

      let totOrdenes = 0
      ordenesDelDia.forEach((o, i) => {
        if (y > 700) { doc.addPage(); y = 40 }
        y = tableRow(doc, y, [
          { text: o.cliente?.nombre ?? '—', x: 48,  w: 145 },
          { text: `${o.vehiculo?.marca} ${o.vehiculo?.modelo} (${o.vehiculo?.placa})`, x: 197, w: 130 },
          { text: o.mecanico?.nombre ?? '—', x: 331, w: 100 },
          { text: fmtMXN(o.totalManoObra), x: 435, w: 70, align: 'right' },
          { text: fmtMXN(o.total),         x: 508, w: 40, align: 'right' },
        ], i % 2 === 0)
        totOrdenes += Number(o.total)
      })

      tableFoot(doc, y, [
        { text: `${ordenesDelDia.length} órdenes`, x: 48,  w: 400 },
        { text: fmtMXN(totOrdenes),                 x: 508, w: 40, align: 'right' },
      ])
    }

    if (ventasRef.length === 0 && ordenesDelDia.length === 0) {
      doc.fillColor('#94a3b8').fontSize(14).font('Helvetica')
         .text('Sin actividad registrada este día', 40, y + 20, { align: 'center', width: 515 })
    }

    doc.end()
  } catch (error) {
    res.status(500).json({ mensaje: 'Error generando PDF', error })
  }
}

// ═══════════════════════════════════════════════════════════════
// PDF REPORTE MENSUAL
// ═══════════════════════════════════════════════════════════════
export const pdfReporteMensual = async (req: Request, res: Response) => {
  try {
    const negocio = await getNegocio()

    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

    const anio = parseInt(req.query.anio as string) || new Date().getFullYear()
    const mes  = parseInt(req.query.mes  as string) || new Date().getMonth() + 1

    const inicio = new Date(anio, mes - 1, 1)
    const fin    = new Date(anio, mes, 0, 23, 59, 59)

    const [ordenes, ventas, compras, deudas] = await Promise.all([
      prisma.ordenTrabajo.findMany({
        where: { createdAt: { gte: inicio, lte: fin }, activo: true },
        include: { mecanico: { select: { nombre: true } } }
      }),
      prisma.ventaRefaccion.findMany({
        where:   { fecha: { gte: inicio, lte: fin } },
        include: { refaccion: { select: { nombre: true, codigo: true } } }
      }),
      prisma.compra.findMany({
        where:   { fecha: { gte: inicio, lte: fin } },
        include: { proveedor: { select: { nombre: true } } }
      }),
      // Deudas pendientes al cierre del mes (creadas hasta el último día del mes)
      prisma.ordenTrabajo.findMany({
        where: {
          estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
          activo:     true,
          createdAt:  { lte: fin },
        },
        include: { cliente: { select: { nombre: true, telefono: true } } },
        orderBy: { createdAt: 'asc' },
      })
    ])

    // ── Totales ───────────────────────────────────────────────
    const ordenesEntregadas = ordenes.filter(o => o.estado === 'ENTREGADO')
    const totalManoObra     = ordenesEntregadas.reduce((s, o) => s + Number(o.totalManoObra), 0)
    const totalTaller       = ordenesEntregadas.reduce((s, o) => s + Number(o.total), 0)
    const totalVentasRef    = ventas.reduce((s, v) => s + Number(v.subtotal), 0)
    const totalGanancia     = ventas.reduce((s, v) => s + Number(v.ganancia), 0)
    const totalCompras      = compras.reduce((s, c) => s + Number(c.total), 0)
    const granTotal         = totalTaller + totalVentasRef
    const utilidadNeta      = granTotal - totalCompras
    const margen            = granTotal > 0
      ? ((totalGanancia / granTotal) * 100).toFixed(1) : '0'

    // Top 10 refacciones
    const porRef: Record<string, any> = {}
    for (const v of ventas) {
      if (!porRef[v.refaccionId]) {
        porRef[v.refaccionId] = {
          nombre:   v.refaccion.nombre,
          codigo:   v.refaccion.codigo,
          cantidad: 0, total: 0, ganancia: 0
        }
      }
      porRef[v.refaccionId].cantidad += v.cantidad
      porRef[v.refaccionId].total    += Number(v.subtotal)
      porRef[v.refaccionId].ganancia += Number(v.ganancia)
    }
    const top10 = Object.values(porRef)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10)

    // Mecánicos
    const porMec: Record<string, any> = {}
    for (const o of ordenesEntregadas) {
      if (!o.mecanicoId) continue
      if (!porMec[o.mecanicoId]) {
        porMec[o.mecanicoId] = { nombre: o.mecanico?.nombre ?? '—', ordenes: 0, manoObra: 0 }
      }
      porMec[o.mecanicoId].ordenes  += 1
      porMec[o.mecanicoId].manoObra += Number(o.totalManoObra)
    }
    const mecanicos = Object.values(porMec)

    // ── Documento ─────────────────────────────────────────────
    const periodoStr = `${MESES[mes - 1]} ${anio}`
    const doc = new PDFDocument({ margin: 40, size: 'LETTER' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="reporte-mensual-${anio}-${String(mes).padStart(2,'0')}.pdf"`)
    doc.pipe(res)

    let y = header(doc, 'REPORTE MENSUAL', periodoStr, negocio)

    // ── Resumen general ───────────────────────────────────────
    y = metricRow(doc, y, [
      { label: 'Ingresos totales',    value: fmtMXN(granTotal),    bg: '#f0fdf4', fg: '#166534' },
      { label: 'Total taller',        value: fmtMXN(totalTaller),  bg: '#eff6ff', fg: '#1d4ed8' },
      { label: 'Ventas mostrador',    value: fmtMXN(totalVentasRef), bg: '#faf5ff', fg: '#6b21a8' },
      { label: 'Utilidad neta',       value: fmtMXN(utilidadNeta), bg: '#ecfdf5', fg: '#065f46' },
    ])
    y = metricRow(doc, y, [
      { label: 'Ganancia refacciones', value: fmtMXN(totalGanancia), bg: '#eff6ff', fg: '#1e40af' },
      { label: 'Margen promedio',      value: `${margen}%`,          bg: '#fff7ed', fg: '#c2410c' },
      { label: 'Total compras',        value: fmtMXN(totalCompras),  bg: '#fef2f2', fg: '#b91c1c' },
      { label: 'Autos atendidos',      value: String([...new Set(ordenesEntregadas.map(o => o.vehiculoId))].length), bg: '#fefce8', fg: '#854d0e' },
    ])
    y += 6

    // ── Taller — mecánicos ────────────────────────────────────
    if (mecanicos.length > 0) {
      y = secTitle(doc, y, '🔧  PRODUCTIVIDAD MECÁNICOS', '#065f46')
      const cols = [
        { text: 'MECÁNICO',    x: 48,  w: 220 },
        { text: 'ÓRDENES',     x: 272, w: 60,  align: 'center' },
        { text: 'MANO DE OBRA', x: 340, w: 120, align: 'right' },
      ]
      y = tableHead(doc, y, cols)
      let totalM = 0
      mecanicos.forEach((m: any, i: number) => {
        y = tableRow(doc, y, [
          { text: m.nombre,           x: 48,  w: 220 },
          { text: String(m.ordenes),  x: 272, w: 60,  align: 'center' },
          { text: fmtMXN(m.manoObra), x: 340, w: 120, align: 'right' },
        ], i % 2 === 0)
        totalM += m.manoObra
      })
      tableFoot(doc, y, [
        { text: `${ordenesEntregadas.length} órdenes entregadas`, x: 48, w: 280 },
        { text: fmtMXN(totalM), x: 340, w: 120, align: 'right' },
      ])
      y += 32
    }

    // ── Top 10 refacciones ────────────────────────────────────
    if (top10.length > 0) {
      if (y > 580) { doc.addPage(); y = 40 }
      y = secTitle(doc, y, '🏪  TOP 10 REFACCIONES MÁS VENDIDAS')
      const cols = [
        { text: '#',         x: 48,  w: 20,  align: 'center' },
        { text: 'REFACCIÓN', x: 72,  w: 210 },
        { text: 'CÓD.',      x: 286, w: 70  },
        { text: 'PIEZAS',    x: 360, w: 50,  align: 'center' },
        { text: 'VENTAS',    x: 413, w: 70,  align: 'right'  },
        { text: 'GANANCIA',  x: 486, w: 70,  align: 'right'  },
      ]
      y = tableHead(doc, y, cols)
      top10.forEach((r: any, i: number) => {
        if (y > 700) { doc.addPage(); y = 40 }
        y = tableRow(doc, y, [
          { text: String(i + 1),    x: 48,  w: 20,  align: 'center' },
          { text: r.nombre,          x: 72,  w: 210 },
          { text: r.codigo,          x: 286, w: 70  },
          { text: String(r.cantidad), x: 360, w: 50, align: 'center' },
          { text: fmtMXN(r.total),   x: 413, w: 70, align: 'right'  },
          { text: fmtMXN(r.ganancia), x: 486, w: 70, align: 'right' },
        ], i % 2 === 0)
      })
      tableFoot(doc, y, [
        { text: 'TOTAL REFACCIONES', x: 48,  w: 360 },
        { text: fmtMXN(totalVentasRef), x: 413, w: 70, align: 'right' },
        { text: fmtMXN(totalGanancia),  x: 486, w: 70, align: 'right' },
      ])
      y += 32
    }

    // ── Compras del mes ───────────────────────────────────────
    if (compras.length > 0) {
      if (y > 620) { doc.addPage(); y = 40 }
      y = secTitle(doc, y, '🛒  COMPRAS DEL MES', '#7c3aed')

      // Agrupar por proveedor
      const porProv: Record<string, { nombre: string; total: number; qty: number }> = {}
      for (const c of compras) {
        const k = c.proveedorId ?? '__sin__'
        if (!porProv[k]) porProv[k] = { nombre: c.proveedor?.nombre ?? 'Sin proveedor', total: 0, qty: 0 }
        porProv[k].total += Number(c.total)
        porProv[k].qty   += 1
      }

      const cols = [
        { text: 'PROVEEDOR',   x: 48,  w: 260 },
        { text: 'ENTRADAS',    x: 312, w: 80,  align: 'center' },
        { text: 'TOTAL',       x: 395, w: 160, align: 'right'  },
      ]
      y = tableHead(doc, y, cols)
      Object.values(porProv).forEach((p: any, i: number) => {
        y = tableRow(doc, y, [
          { text: p.nombre,     x: 48,  w: 260 },
          { text: String(p.qty), x: 312, w: 80, align: 'center' },
          { text: fmtMXN(p.total), x: 395, w: 160, align: 'right' },
        ], i % 2 === 0)
      })
      tableFoot(doc, y, [
        { text: `${compras.length} entradas de compra`, x: 48, w: 344 },
        { text: fmtMXN(totalCompras), x: 395, w: 160, align: 'right' },
      ])
      y += 32
    }

    // ── Cuentas por cobrar pendientes ────────────────────────
    if (deudas.length > 0) {
      if (y > 580) { doc.addPage(); y = 40 }
      y = secTitle(doc, y, '  CUENTAS POR COBRAR PENDIENTES', '#7f1d1d')

      const totalDeuda     = deudas.reduce((s, d) => s + Number(d.saldoPendiente), 0)
      const totalFacturado = deudas.reduce((s, d) => s + Number(d.total), 0)
      const hoy            = new Date()

      y = metricRow(doc, y, [
        { label: 'Clientes con saldo', value: String(deudas.length),           bg: '#fef2f2', fg: '#b91c1c' },
        { label: 'Total por cobrar',   value: fmtMXN(totalDeuda),              bg: '#fff1f2', fg: '#9f1239' },
        { label: 'Total facturado',    value: fmtMXN(totalFacturado),          bg: '#fffbeb', fg: '#92400e' },
        { label: 'Ya cobrado',         value: fmtMXN(totalFacturado - totalDeuda), bg: '#f0fdf4', fg: '#166534' },
      ])
      y += 4

      const cols = [
        { text: 'CLIENTE',  x: 48,  w: 155 },
        { text: '# ORDEN',  x: 207, w: 50,  align: 'center' },
        { text: 'INGRESO',  x: 261, w: 72  },
        { text: 'DIAS',     x: 337, w: 35,  align: 'center' },
        { text: 'TOTAL OT', x: 376, w: 70,  align: 'right'  },
        { text: 'PAGADO',   x: 450, w: 60,  align: 'right'  },
        { text: 'SALDO',    x: 513, w: 40,  align: 'right'  },
      ]
      y = tableHead(doc, y, cols)

      let totalSaldo = 0
      deudas.forEach((d, i) => {
        if (y > 700) { doc.addPage(); y = 40 }
        const dias      = Math.floor((hoy.getTime() - new Date(d.createdAt).getTime()) / 86_400_000)
        const esParcial = d.estadoPago === 'PARCIAL'
        y = tableRow(doc, y, [
          { text: d.cliente?.nombre ?? '—',
              x: 48,  w: 155 },
          { text: String(d.numero),
              x: 207, w: 50,  align: 'center' },
          { text: new Date(d.createdAt).toLocaleDateString('es-MX',
              { day: '2-digit', month: 'short', year: '2-digit' }),
              x: 261, w: 72  },
          { text: `${dias}d`,
              x: 337, w: 35,  align: 'center' },
          { text: fmtMXN(d.total),
              x: 376, w: 70,  align: 'right'  },
          { text: esParcial ? fmtMXN(d.totalPagado) : '$0.00',
              x: 450, w: 60,  align: 'right'  },
          { text: fmtMXN(d.saldoPendiente),
              x: 513, w: 40,  align: 'right'  },
        ], i % 2 === 0)
        totalSaldo += Number(d.saldoPendiente)
      })

      tableFoot(doc, y, [
        { text: `${deudas.length} cuenta${deudas.length !== 1 ? 's' : ''} pendiente${deudas.length !== 1 ? 's' : ''}`,
            x: 48,  w: 462 },
        { text: fmtMXN(totalSaldo),
            x: 513, w: 40,  align: 'right' },
      ])
    }

    doc.end()
  } catch (error) {
    res.status(500).json({ mensaje: 'Error generando PDF', error })
  }
}
