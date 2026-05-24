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

    const nuevoTotal = Number(orden.totalManoObra) + totalRefacciones
    const ordenActualizada = await prisma.ordenTrabajo.update({
      where: { id: ordenId as string},
      data: {
        totalRefacciones,
        total:          nuevoTotal,
        saldoPendiente: nuevoTotal - Number(orden.totalPagado),
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

    const nuevoTotal = Number(detalle.orden.totalManoObra) + totalRefacciones
    await prisma.ordenTrabajo.update({
      where: { id: detalle.ordenId },
      data: {
        totalRefacciones,
        total:          nuevoTotal,
        saldoPendiente: nuevoTotal - Number(detalle.orden.totalPagado)
      }
    })

    return res.json({ mensaje: 'Refacción quitada y stock devuelto' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Agregar múltiples refacciones en un solo viaje (lote) ────────
export const agregarRefaccionesLote = async (
  req: RequestConUsuario,
  res: Response
) => {
  try {
    const ordenId = req.params.id as string
    const { items } = req.body as {
      items: { refaccionId: string; cantidad: number; precioUnitario?: number }[]
    }

    if (!items?.length) {
      return res.status(400).json({ mensaje: 'Debes incluir al menos una refacción' })
    }

    // Verificar orden activa
    const orden = await prisma.ordenTrabajo.findUnique({ where: { id: ordenId } })
    if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' })
    if (['ENTREGADO', 'CANCELADO'].includes(orden.estado)) {
      return res.status(400).json({ mensaje: 'No se puede modificar una orden entregada o cancelada' })
    }

    // Verificar stock de todas las piezas antes de tocar nada
    const refacciones = await prisma.refaccion.findMany({
      where: { id: { in: items.map(i => i.refaccionId) } }
    })

    for (const item of items) {
      const ref = refacciones.find(r => r.id === item.refaccionId)
      if (!ref) return res.status(404).json({ mensaje: `Refacción no encontrada` })
      if (ref.stockActual < item.cantidad) {
        return res.status(400).json({
          mensaje: `Stock insuficiente para "${ref.nombre}". Disponible: ${ref.stockActual}`
        })
      }
    }

    // Transacción atómica: crear detalles + descontar stock + movimientos
    await prisma.$transaction(
      items.flatMap(item => {
        const ref      = refacciones.find(r => r.id === item.refaccionId)!
        const precio   = item.precioUnitario ?? Number(ref.precioTaller)
        const subtotal = precio * item.cantidad
        return [
          prisma.ordenDetalle.create({
            data: {
              ordenId,
              refaccionId:    item.refaccionId,
              cantidad:       item.cantidad,
              precioUnitario: precio,
              costoSnapshot:  Number(ref.costoCompra),
              subtotal,
            }
          }),
          prisma.refaccion.update({
            where: { id: item.refaccionId },
            data:  { stockActual: { decrement: item.cantidad } }
          }),
          prisma.movimientoInventario.create({
            data: {
              refaccionId: item.refaccionId,
              tipo:        'SALIDA',
              cantidad:    item.cantidad,
              motivo:      `Orden de trabajo #${orden.numero}`
            }
          }),
        ]
      })
    )

    // Recalcular total de la orden
    const todosDetalles = await prisma.ordenDetalle.findMany({ where: { ordenId } })
    const totalRefacciones = todosDetalles.reduce((s, d) => s + Number(d.subtotal), 0)

    const ordenActualizada = await prisma.ordenTrabajo.update({
      where: { id: ordenId },
      data:  {
        totalRefacciones,
        total:           Number(orden.totalManoObra) + totalRefacciones,
        saldoPendiente:  Number(orden.totalManoObra) + totalRefacciones - Number(orden.totalPagado),
        modificadoPorId: req.usuario?.id ?? null,
      },
      include: {
        cliente:  { select: { nombre: true } },
        vehiculo: { select: { placa: true, marca: true, modelo: true } },
      }
    })

    return res.status(201).json({
      mensaje:        `${items.length} refacción${items.length !== 1 ? 'es' : ''} agregada${items.length !== 1 ? 's' : ''} a la orden`,
      itemsAgregados: items.length,
      orden:          ordenActualizada,
    })
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