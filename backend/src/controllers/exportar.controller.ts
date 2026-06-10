import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import * as XLSX from 'xlsx'

// ── Helper: convierte array de objetos a Excel y lo envía ─────
function enviarExcel(res: Response, datos: object[], nombreHoja: string, nombreArchivo: string) {
  const libro  = XLSX.utils.book_new()
  const hoja   = XLSX.utils.json_to_sheet(datos)
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja)
  const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.xlsx"`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buffer)
}

const fmt = (n: any) => Number(n ?? 0).toFixed(2)
const fmtFecha = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('es-MX') : ''

// ── GET /api/exportar/ordenes ─────────────────────────────────
export async function exportarOrdenes(req: Request, res: Response) {
  try {
    const { desde, hasta, estado } = req.query as Record<string, string>

    const where: any = { activo: true }
    if (desde || hasta) {
      where.fechaIngreso = {}
      if (desde) where.fechaIngreso.gte = new Date(desde)
      if (hasta) {
        const h = new Date(hasta); h.setHours(23, 59, 59)
        where.fechaIngreso.lte = h
      }
    }
    if (estado) where.estado = estado

    const ordenes = await prisma.ordenTrabajo.findMany({
      where,
      include: {
        cliente:  { select: { nombre: true, telefono: true } },
        vehiculo: { select: { marca: true, modelo: true, placa: true, anio: true } },
        mecanico: { select: { nombre: true } },
        servicios:{ include: { servicio: { select: { nombre: true } } } },
      },
      orderBy: { numero: 'asc' },
    })

    const filas = ordenes.map(o => ({
      '# Orden':       o.numero,
      'Fecha':         fmtFecha(o.fechaIngreso),
      'Fecha entrega': fmtFecha(o.fechaEntrega),
      'Estado':        o.estado,
      'Pago':          o.estadoPago,
      'Cliente':       o.cliente?.nombre ?? '',
      'Teléfono':      o.cliente?.telefono ?? '',
      'Vehículo':      `${o.vehiculo?.marca ?? ''} ${o.vehiculo?.modelo ?? ''}`.trim(),
      'Placa':         o.vehiculo?.placa ?? '',
      'Año':           o.vehiculo?.anio ?? '',
      'Mecánico':      o.mecanico?.nombre ?? '',
      'Servicios':     o.servicios.map(s => s.servicio.nombre).join(', '),
      'Mano de obra':  fmt(o.totalManoObra),
      'Refacciones':   fmt(o.totalRefacciones),
      'Total':         fmt(o.total),
      'Pagado':        fmt(o.totalPagado),
      'Saldo':         fmt(o.saldoPendiente),
      'Diagnóstico':   o.diagnostico ?? '',
      'Garantía meses':o.garantiaMeses ?? '',
      'Garantía vence':fmtFecha(o.garantiaVence),
    }))

    const rango = desde && hasta ? `${desde}_${hasta}` : new Date().toISOString().split('T')[0]
    enviarExcel(res, filas, 'Órdenes', `ordenes_${rango}`)
  } catch (err) {
    console.error('Error exportar ordenes:', err)
    res.status(500).json({ mensaje: 'Error al exportar' })
  }
}

// ── GET /api/exportar/clientes ────────────────────────────────
export async function exportarClientes(req: Request, res: Response) {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { activo: true },
      include: {
        vehiculos: { select: { marca: true, modelo: true, placa: true, anio: true } },
        ordenes: {
          where:  { activo: true },
          select: { total: true, estado: true },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    const filas = clientes.map(c => ({
      'Nombre':        c.nombre,
      'Teléfono':      c.telefono ?? '',
      'Email':         c.email ?? '',
      'RFC':           c.rfc ?? '',
      'Dirección':     c.direccion ?? '',
      'Vehículos':     c.vehiculos.map(v => `${v.marca} ${v.modelo} (${v.placa})`).join(' | '),
      'Total órdenes': c.ordenes.length,
      'Gasto total':   fmt(c.ordenes.reduce((s, o) => s + Number(o.total), 0)),
    }))

    enviarExcel(res, filas, 'Clientes', `clientes_${new Date().toISOString().split('T')[0]}`)
  } catch (err) {
    console.error('Error exportar clientes:', err)
    res.status(500).json({ mensaje: 'Error al exportar' })
  }
}

// ── GET /api/exportar/inventario ──────────────────────────────
export async function exportarInventario(req: Request, res: Response) {
  try {
    const refacciones = await prisma.refaccion.findMany({
      where: { activo: true },
      include: { proveedor: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' },
    })

    const filas = refacciones.map(r => ({
      'Código':         r.codigo ?? '',
      'Nombre':         r.nombre,
      'Descripción':    r.descripcion ?? '',
      'Proveedor':      r.proveedor?.nombre ?? '',
      'Stock actual':   r.stockActual,
      'Stock mínimo':   r.stockMinimo,
      'Precio compra':  fmt(r.precioCompra),
      'Precio taller':  fmt(r.precioTaller),
      'Estado':         r.stockActual <= r.stockMinimo ? 'STOCK BAJO' : 'OK',
      'Valor inventario': fmt(Number(r.precioCompra) * r.stockActual),
    }))

    enviarExcel(res, filas, 'Inventario', `inventario_${new Date().toISOString().split('T')[0]}`)
  } catch (err) {
    console.error('Error exportar inventario:', err)
    res.status(500).json({ mensaje: 'Error al exportar' })
  }
}

// ── GET /api/exportar/deudas ──────────────────────────────────
export async function exportarDeudas(req: Request, res: Response) {
  try {
    const ordenes = await prisma.ordenTrabajo.findMany({
      where: { saldoPendiente: { gt: 0 }, activo: true },
      include: {
        cliente:  { select: { nombre: true, telefono: true } },
        vehiculo: { select: { marca: true, modelo: true, placa: true } },
      },
      orderBy: { saldoPendiente: 'desc' },
    })

    const filas = ordenes.map(o => ({
      '# Orden':     o.numero,
      'Fecha':       fmtFecha(o.fechaIngreso),
      'Cliente':     o.cliente?.nombre ?? '',
      'Teléfono':    o.cliente?.telefono ?? '',
      'Vehículo':    `${o.vehiculo?.marca ?? ''} ${o.vehiculo?.modelo ?? ''}`.trim(),
      'Placa':       o.vehiculo?.placa ?? '',
      'Total orden': fmt(o.total),
      'Pagado':      fmt(o.totalPagado),
      'Saldo debe':  fmt(o.saldoPendiente),
      'Estado':      o.estadoPago,
    }))

    const total = ordenes.reduce((s, o) => s + Number(o.saldoPendiente), 0)
    filas.push({
      '# Orden': 0, 'Fecha': '', 'Cliente': 'TOTAL',
      'Teléfono': '', 'Vehículo': '', 'Placa': '',
      'Total orden': '', 'Pagado': '', 'Saldo debe': fmt(total), 'Estado': '',
    } as any)

    enviarExcel(res, filas, 'Deudas', `deudas_${new Date().toISOString().split('T')[0]}`)
  } catch (err) {
    console.error('Error exportar deudas:', err)
    res.status(500).json({ mensaje: 'Error al exportar' })
  }
}
