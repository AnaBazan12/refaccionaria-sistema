import { Request, Response } from 'express'
import {prisma} from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

const incluirCotizacion = {
  cliente:  { select: { nombre: true, telefono: true } },
  vehiculo: { select: { placa: true, marca: true, modelo: true } },
  creadoPor:{ select: { nombre: true } },
  items: {
    include: {
      refaccion: { select: { nombre: true, codigo: true } },
      servicio:  { select: { nombre: true } }
    }
  }
}

export const obtenerCotizaciones = async (_req: Request, res: Response) => {
  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      include: incluirCotizacion,
      orderBy: { createdAt: 'desc' }
    })
    return res.json(cotizaciones)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const obtenerCotizacionPorId = async (req: Request, res: Response) => {
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where:   { id: req.params.id as string},
      include: incluirCotizacion
    })
    if (!cotizacion) {
      return res.status(404).json({ mensaje: 'Cotización no encontrada' })
    }
    return res.json(cotizacion)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const crearCotizacion = async (
  req: RequestConUsuario,
  res: Response
) => {
  try {
    const { clienteId, vehiculoId, notas, validaHasta, items } = req.body

    // Calcular total
    let total = 0
    const itemsData = items.map((item: any) => {
      const subtotal = item.cantidad * item.precioUnitario
      total += subtotal
      return {
        descripcion:    item.descripcion,
        cantidad:       item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal,
        refaccionId:    item.refaccionId ?? null,
        servicioId:     item.servicioId  ?? null
      }
    })

    const cotizacion = await prisma.cotizacion.create({
      data: {
        clienteId,
        vehiculoId:  vehiculoId  ?? null,
        notas:       notas       ?? null,
        validaHasta: validaHasta ? new Date(validaHasta) : null,
        creadoPorId: req.usuario?.id ?? null,
        total,
        items: { create: itemsData }
      },
      include: incluirCotizacion
    })

    return res.status(201).json({ mensaje: 'Cotización creada', cotizacion })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Convertir cotización en orden de trabajo ──────────────────
export const convertirEnOrden = async (
  req: RequestConUsuario,
  res: Response
) => {
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where:   { id: req.params.id as string},
      include: { items: true }
    })
    if (!cotizacion) {
      return res.status(404).json({ mensaje: 'Cotización no encontrada' })
    }
    if (cotizacion.estado === 'CONVERTIDA') {
      return res.status(400).json({
        mensaje: 'Esta cotización ya fue convertida en orden'
      })
    }

    const { mecanicoId, kilometraje, diagnostico } = req.body

    // Separar items en servicios y refacciones
    const serviciosItems  = cotizacion.items.filter(i => i.servicioId)
    const refaccionesItems = cotizacion.items.filter(i => i.refaccionId)

    const totalManoObra = serviciosItems.reduce(
      (s, i) => s + Number(i.subtotal), 0
    )

    // Crear la orden
    const orden = await prisma.ordenTrabajo.create({
      data: {
        clienteId:   cotizacion.clienteId,
        vehiculoId:  cotizacion.vehiculoId!,
        mecanicoId:  mecanicoId ?? null,
        kilometraje: kilometraje ?? null,
        diagnostico: diagnostico ?? cotizacion.notas,
        totalManoObra,
        total:       Number(cotizacion.total),
        saldoPendiente: Number(cotizacion.total),
        creadoPorId: req.usuario?.id ?? null,

        // Crear servicios de la cotización
        servicios: {
          create: serviciosItems.map(i => ({
            servicioId:     i.servicioId!,
            cantidad:       i.cantidad,
            precioUnitario: i.precioUnitario,
            subtotal:       i.subtotal
          }))
        }
      }
    })

    // Agregar refacciones al detalle con descuento de stock
    for (const item of refaccionesItems) {
      const refaccion = await prisma.refaccion.findUnique({
        where: { id: item.refaccionId! }
      })
      if (refaccion && refaccion.stockActual >= item.cantidad) {
        await prisma.$transaction([
          prisma.ordenDetalle.create({
            data: {
              ordenId:        orden.id,
              refaccionId:    item.refaccionId!,
              cantidad:       item.cantidad,
              precioUnitario: item.precioUnitario,
              costoSnapshot:  Number(refaccion.costoCompra),
              subtotal:       item.subtotal
            }
          }),
          prisma.refaccion.update({
            where: { id: item.refaccionId! },
            data:  { stockActual: { decrement: item.cantidad } }
          })
        ])
      }
    }

    // Marcar cotización como convertida
    await prisma.cotizacion.update({
      where: { id: req.params.id as string},
      data:  { estado: 'CONVERTIDA', ordenId: orden.id }
    })

    return res.json({
      mensaje: 'Cotización convertida en orden de trabajo',
      ordenId: orden.id,
      numero:  orden.numero
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const rechazarCotizacion = async (req: Request, res: Response) => {
  try {
    const cotizacion = await prisma.cotizacion.update({
      where: { id: req.params.id as string },
      data:  { estado: 'RECHAZADA' }
    })
    return res.json({ mensaje: 'Cotización rechazada', cotizacion })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}