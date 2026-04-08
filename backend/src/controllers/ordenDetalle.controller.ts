import { Request, Response } from 'express'
import {prisma } from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

// ── Agregar refacción a la orden ──────────────────────────────
export const agregarRefaccion = async (
  req: RequestConUsuario,
  res: Response
) => {
  try {
    const { refaccionId, cantidad, precioUnitario, notas } = req.body
    const ordenId = req.params.id

    // Verificar que la orden existe y no está entregada
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: ordenId as string}
    })
    if (!orden) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' })
    }
    if (orden.estado === 'ENTREGADO' || orden.estado === 'CANCELADO') {
      return res.status(400).json({
        mensaje: 'No se puede modificar una orden entregada o cancelada'
      })
    }

    // Verificar stock disponible
    const refaccion = await prisma.refaccion.findUnique({
      where: { id: refaccionId }
    })
    if (!refaccion) {
      return res.status(404).json({ mensaje: 'Refacción no encontrada' })
    }
    if (refaccion.stockActual < cantidad) {
      return res.status(400).json({
        mensaje: `Stock insuficiente. Disponible: ${refaccion.stockActual} piezas`
      })
    }

    const precio   = precioUnitario ?? Number(refaccion.precioTaller)
    const costo    = Number(refaccion.costoCompra)
    const subtotal = precio * cantidad
    
    // Transacción: crear detalle + descontar stock + actualizar total OT
    const [detalle] = await prisma.$transaction([

      // 1. Crear el detalle
      prisma.ordenDetalle.create({
        data: {
          ordenId : ordenId as string,
          refaccionId,
          cantidad,
          precioUnitario: precio,
          costoSnapshot:  costo,   // snapshot del costo actual
          subtotal,
          notas: notas ?? null
        },
        include: {
          refaccion: { select: { nombre: true, codigo: true } }
        }
      }),

      // 2. Descontar stock
      prisma.refaccion.update({
        where: { id: refaccionId },
        data:  { stockActual: { decrement: cantidad } }
      }),

      // 3. Registrar movimiento
      prisma.movimientoInventario.create({
        data: {
          refaccionId,
          tipo:     'SALIDA',
          cantidad,
          motivo:   `Orden de trabajo #${orden.numero}`
        }
      })
    ])

    // 4. Recalcular total de refacciones en la OT
    
    const todosLosDetalles = await prisma.ordenDetalle.findMany({
    
      where: { ordenId: ordenId as string }
    })
    const totalRefacciones = todosLosDetalles.reduce(
      (s, d) => s + Number(d.subtotal), 0
    )

    const ordenActualizada = await prisma.ordenTrabajo.update({
      where: { id: ordenId as string},
      data: {
        totalRefacciones,
        total:          Number(orden.totalManoObra) + totalRefacciones,
        saldoPendiente: Number(orden.total) - Number(orden.totalPagado),
        modificadoPorId: req.usuario?.id ?? null
      },
      include: {
        detalle: {
          include: {
            refaccion: { select: { nombre: true, codigo: true } }
          }
        }
      }
    })

    return res.status(201).json({
      mensaje:  'Refacción agregada y stock descontado',
      detalle,
      orden:    ordenActualizada
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Quitar refacción de la orden (devuelve stock) ─────────────
export const quitarRefaccion = async (
  req: RequestConUsuario,
  res: Response
) => {
  try {
    const detalle = await prisma.ordenDetalle.findUnique({
      where: { id: req.params.detalleId as string},
      include: { orden: true }
    })
    if (!detalle) {
      return res.status(404).json({ mensaje: 'Detalle no encontrado' })
    }
    if (
      detalle.orden.estado === 'ENTREGADO' ||
      detalle.orden.estado === 'CANCELADO'
    ) {
      return res.status(400).json({
        mensaje: 'No se puede modificar una orden entregada o cancelada'
      })
    }

    // Transacción: eliminar detalle + devolver stock
    await prisma.$transaction([
      prisma.ordenDetalle.delete({
        where: { id: req.params.detalleId as string }
      }),
      prisma.refaccion.update({
        where: { id: detalle.refaccionId },
        data:  { stockActual: { increment: detalle.cantidad } }
      }),
      prisma.movimientoInventario.create({
        data: {
          refaccionId: detalle.refaccionId,
          tipo:        'ENTRADA',
          cantidad:    detalle.cantidad,
          motivo:      `Cancelación en orden #${detalle.orden.numero}`
        }
      })
    ])

    // Recalcular total
    const restantes = await prisma.ordenDetalle.findMany({
      where: { ordenId: detalle.ordenId }
    })
    const totalRefacciones = restantes.reduce(
      (s, d) => s + Number(d.subtotal), 0
    )

    await prisma.ordenTrabajo.update({
      where: { id: detalle.ordenId },
      data: {
        totalRefacciones,
        total: Number(detalle.orden.totalManoObra) + totalRefacciones
      }
    })

    return res.json({ mensaje: 'Refacción quitada y stock devuelto' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Obtener detalle de una orden ──────────────────────────────
export const obtenerDetalle = async (req: Request, res: Response) => {
  try {
    const detalle = await prisma.ordenDetalle.findMany({
      where: { ordenId: req.params.id as string },
      include: {
        refaccion: {
          select: {
            nombre: true, codigo: true,
            costoCompra: true, stockActual: true
          }
        }
      }
    })
    return res.json(detalle)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}