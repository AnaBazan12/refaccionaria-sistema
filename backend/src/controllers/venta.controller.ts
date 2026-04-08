import { Request, Response } from 'express'
import {prisma} from '../utils/prisma'
import { TipoVenta } from '../generated/client'
import { RequestConUsuario } from '../middlewares/auth.middleware'

// ── Registrar una venta ───────────────────────────────────────
export const registrarVenta = async (req: RequestConUsuario, res: Response) => {
  try {
    const {
      refaccionId, cantidad, tipoVenta,
      ordenId   // opcional, si es venta de taller
    } = req.body

    const refaccion = await prisma.refaccion.findUnique({
      where: { id: refaccionId }
    })
    if (!refaccion) return res.status(404).json({ mensaje: 'Refacción no encontrada' })

    if (refaccion.stockActual < cantidad) {
      return res.status(400).json({
        mensaje: `Stock insuficiente. Disponible: ${refaccion.stockActual}`
      })
    }

    // Elegir precio según tipo de venta
    let precioUnitario: number
    if (tipoVenta === 'MAYOREO' && refaccion.precioMayoreo) {
      precioUnitario = Number(refaccion.precioMayoreo)
    } else if (tipoVenta === 'TALLER') {
      precioUnitario = Number(refaccion.precioTaller)
    } else {
      precioUnitario = Number(refaccion.precioMostrador)
    }

    const precioSinIva  = precioUnitario / 1.16
    const costoCompra   = Number(refaccion.costoCompra)
    const ganancia      = (precioSinIva - costoCompra) * cantidad
    const subtotal      = precioUnitario * cantidad

    // Crear la venta y descontar el stock en una transacción
    const [venta] = await prisma.$transaction([
      prisma.ventaRefaccion.create({
        data: {
          refaccionId,
          cantidad,
          tipoVenta:     tipoVenta as TipoVenta,
          precioUnitario,
          precioSinIva,
          costoCompra,
          ganancia,
          subtotal,
          ordenId:   ordenId ?? null,
          usuarioId: req.usuario?.id ?? null
        },
        include: {
          refaccion: { select: { nombre: true, codigo: true } }
        }
      }),
      prisma.refaccion.update({
        where: { id: refaccionId },
        data:  { stockActual: { decrement: cantidad } }
      }),
      prisma.movimientoInventario.create({
        data: {
          refaccionId,
          tipo:     'SALIDA',
          cantidad,
          motivo:   `Venta ${tipoVenta}`
        }
      })
    ])

    return res.status(201).json({
      mensaje: 'Venta registrada',
      desglose: {
        precioConIva:  precioUnitario.toFixed(2),
        precioSinIva:  precioSinIva.toFixed(2),
        costo:         costoCompra.toFixed(2),
        gananciaPieza: (precioSinIva - costoCompra).toFixed(2),
        gananciaTotal: ganancia.toFixed(2),
        subtotal:      subtotal.toFixed(2)
      },
      venta
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Ventas del día ────────────────────────────────────────────
export const ventasDelDia = async (req: Request, res: Response) => {
  try {
    const fecha = req.query.fecha
      ? new Date(req.query.fecha as string)
      : new Date()

    const inicio = new Date(fecha)
    inicio.setHours(0, 0, 0, 0)
    const fin = new Date(fecha)
    fin.setHours(23, 59, 59, 999)

    const ventas = await prisma.ventaRefaccion.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: {
        refaccion: { select: { nombre: true, codigo: true } },
        usuario:   { select: { nombre: true } }
      },
      orderBy: { fecha: 'desc' }
    })

    // Totales del día
    const totalVentas   = ventas.reduce((s, v) => s + Number(v.subtotal),  0)
    const totalGanancia = ventas.reduce((s, v) => s + Number(v.ganancia),  0)
    const totalCosto    = ventas.reduce((s, v) => s + Number(v.costoCompra) * v.cantidad, 0)

    // Agrupar por tipo de venta
    const porTipo = ventas.reduce((acc: any, v) => {
      if (!acc[v.tipoVenta]) acc[v.tipoVenta] = { cantidad: 0, total: 0, ganancia: 0 }
      acc[v.tipoVenta].cantidad  += v.cantidad
      acc[v.tipoVenta].total     += Number(v.subtotal)
      acc[v.tipoVenta].ganancia  += Number(v.ganancia)
      return acc
    }, {})

    return res.json({
      fecha:          inicio.toISOString().split('T')[0],
      totalVentas:    totalVentas.toFixed(2),
      totalGanancia:  totalGanancia.toFixed(2),
      totalCosto:     totalCosto.toFixed(2),
      porTipo,
      ventas
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Reporte mensual de ventas ─────────────────────────────────
export const reporteMensual = async (req: Request, res: Response) => {
  try {
    const anio = parseInt(req.query.anio as string) || new Date().getFullYear()
    const mes  = parseInt(req.query.mes  as string) || new Date().getMonth() + 1

    const inicio = new Date(anio, mes - 1, 1)
    const fin    = new Date(anio, mes, 0, 23, 59, 59)

    const ventas = await prisma.ventaRefaccion.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: {
        refaccion: { select: { nombre: true, codigo: true, costoCompra: true } }
      }
    })

    const totalVentas   = ventas.reduce((s, v) => s + Number(v.subtotal), 0)
    const totalGanancia = ventas.reduce((s, v) => s + Number(v.ganancia), 0)

    // Top 10 refacciones más vendidas
    const porRefaccion: Record<string, any> = {}
    for (const v of ventas) {
      const key = v.refaccionId
      if (!porRefaccion[key]) {
        porRefaccion[key] = {
          nombre:    v.refaccion.nombre,
          codigo:    v.refaccion.codigo,
          cantidad:  0,
          total:     0,
          ganancia:  0
        }
      }
      porRefaccion[key].cantidad += v.cantidad
      porRefaccion[key].total    += Number(v.subtotal)
      porRefaccion[key].ganancia += Number(v.ganancia)
    }

    const top10 = Object.values(porRefaccion)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10)

    return res.json({
      periodo:        `${mes}/${mes}/${anio}`,
      totalVentas:    totalVentas.toFixed(2),
      totalGanancia:  totalGanancia.toFixed(2),
      margenPromedio: totalVentas > 0
        ? ((totalGanancia / totalVentas) * 100).toFixed(1) + '%'
        : '0%',
      top10Refacciones: top10
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}