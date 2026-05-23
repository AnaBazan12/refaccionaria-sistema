import { Response } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

// ── Registrar una entrada de inventario ──────────────────────
export const registrarCompra = async (req: RequestConUsuario, res: Response) => {
  try {
    const {
      proveedorId,    // opcional
      facturaNumero,  // opcional
      notas,          // opcional
      actualizarCostos, // boolean — si true, actualiza costoCompra en cada refaccion
      items           // [{ refaccionId, cantidad, costoUnitario }]
    } = req.body as {
      proveedorId?:    string
      facturaNumero?:  string
      notas?:          string
      actualizarCostos: boolean
      items: { refaccionId: string; cantidad: number; costoUnitario: number }[]
    }

    if (!items?.length) {
      return res.status(400).json({ mensaje: 'La compra debe tener al menos una refacción' })
    }

    // Validar que existan todas las refacciones
    const refacciones = await prisma.refaccion.findMany({
      where: { id: { in: items.map(i => i.refaccionId) } },
      select: { id: true, nombre: true, stockActual: true }
    })

    for (const item of items) {
      if (!refacciones.find(r => r.id === item.refaccionId)) {
        return res.status(404).json({ mensaje: `Refacción no encontrada: ${item.refaccionId}` })
      }
      if (item.cantidad <= 0) {
        return res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' })
      }
      if (item.costoUnitario <= 0) {
        return res.status(400).json({ mensaje: 'El costo unitario debe ser mayor a 0' })
      }
    }

    const compraId = randomUUID()
    const total    = items.reduce((s, i) => s + i.costoUnitario * i.cantidad, 0)

    // Construir operaciones de la transacción
    const ops: any[] = [
      // 1. Crear registro cabecera de compra
      prisma.compra.create({
        data: {
          id: compraId,
          proveedorId:   proveedorId   ?? null,
          facturaNumero: facturaNumero ?? null,
          notas:         notas         ?? null,
          total,
          items: {
            create: items.map(i => ({
              refaccionId:    i.refaccionId,
              cantidad:       i.cantidad,
              costoUnitario:  i.costoUnitario,
              subtotal:       i.costoUnitario * i.cantidad,
              actualizoCosto: actualizarCostos,
            }))
          }
        },
        include: {
          items: {
            include: { refaccion: { select: { nombre: true, codigo: true } } }
          },
          proveedor: { select: { nombre: true } }
        }
      })
    ]

    // 2. Por cada item: sumar stock + MovimientoInventario + (opcional) actualizar costo
    for (const item of items) {
      ops.push(
        prisma.refaccion.update({
          where: { id: item.refaccionId },
          data:  {
            stockActual: { increment: item.cantidad },
            ...(actualizarCostos ? { costoCompra: item.costoUnitario } : {})
          }
        })
      )
      ops.push(
        prisma.movimientoInventario.create({
          data: {
            refaccionId: item.refaccionId,
            tipo:        'ENTRADA',
            cantidad:    item.cantidad,
            motivo:      facturaNumero
              ? `Compra factura ${facturaNumero}`
              : 'Entrada de inventario'
          }
        })
      )
    }

    const [compra] = await prisma.$transaction(ops)

    return res.status(201).json({
      mensaje:  'Entrada registrada correctamente',
      compraId,
      total:    total.toFixed(2),
      articulos: items.length,
      compra
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Listar compras ────────────────────────────────────────────
export const getCompras = async (req: RequestConUsuario, res: Response) => {
  try {
    const { proveedorId, desde, hasta, page = '1', limit = '20' } = req.query as Record<string, string>

    const donde: any = {}
    if (proveedorId) donde.proveedorId = proveedorId
    if (desde || hasta) {
      donde.fecha = {}
      if (desde) donde.fecha.gte = new Date(desde + 'T00:00:00')
      if (hasta) donde.fecha.lte = new Date(hasta + 'T23:59:59')
    }

    const pageNum  = Math.max(1, parseInt(page))
    const limitNum = Math.min(50, parseInt(limit))
    const skip     = (pageNum - 1) * limitNum

    const [compras, total] = await Promise.all([
      prisma.compra.findMany({
        where:   donde,
        include: {
          proveedor: { select: { nombre: true } },
          items: {
            include: { refaccion: { select: { nombre: true, codigo: true } } }
          }
        },
        orderBy: { fecha: 'desc' },
        skip,
        take:  limitNum
      }),
      prisma.compra.count({ where: donde })
    ])

    return res.json({
      compras,
      total,
      pagina:      pageNum,
      totalPaginas: Math.ceil(total / limitNum)
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
