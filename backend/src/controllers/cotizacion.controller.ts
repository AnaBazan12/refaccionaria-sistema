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

export const obtenerCotizaciones = async (req: Request, res: Response) => {
  try {
    const { estado } = req.query
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const skip  = (page - 1) * limit

    const where: any = {}
    if (estado) where.estado = estado

    const [cotizaciones, total] = await prisma.$transaction([
      prisma.cotizacion.findMany({
        where,
        include: incluirCotizacion,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.cotizacion.count({ where }),
    ])

    return res.json({ data: cotizaciones, total, page, limit, totalPaginas: Math.ceil(total / limit) })
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

// ── Aprobar cotización ────────────────────────────────────────
export const aprobarCotizacion = async (req: Request, res: Response) => {
  try {
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: req.params.id as string }
    })
    if (!cotizacion) {
      return res.status(404).json({ mensaje: 'Cotización no encontrada' })
    }
    if (cotizacion.estado === 'CONVERTIDA') {
      return res.status(400).json({ mensaje: 'Ya fue convertida en orden' })
    }
    if (cotizacion.estado === 'RECHAZADA') {
      return res.status(400).json({ mensaje: 'No se puede aprobar una cotización rechazada' })
    }
    const actualizada = await prisma.cotizacion.update({
      where: { id: req.params.id as string },
      data:  { estado: 'APROBADA' }
    })
    return res.json({ mensaje: 'Cotización aprobada', cotizacion: actualizada })
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
    if (!cotizacion.vehiculoId) {
      return res.status(400).json({
        mensaje: 'La cotización debe tener un vehículo para convertirse en orden'
      })
    }

    const { mecanicoId, kilometraje, diagnostico } = req.body

    // Separar items en servicios y refacciones
    const serviciosItems   = cotizacion.items.filter(i => i.servicioId)
    const refaccionesItems = cotizacion.items.filter(i => i.refaccionId)

    const totalManoObra = serviciosItems.reduce(
      (s, i) => s + Number(i.subtotal), 0
    )

    // Verificar stock de todas las refacciones antes de crear nada
    const refacciones = await prisma.refaccion.findMany({
      where: { id: { in: refaccionesItems.map(i => i.refaccionId!) } }
    })
    const sinStock: string[] = []
    for (const item of refaccionesItems) {
      const ref = refacciones.find(r => r.id === item.refaccionId)
      if (!ref || ref.stockActual < item.cantidad) {
        sinStock.push(ref?.nombre ?? item.refaccionId!)
      }
    }
    if (sinStock.length > 0) {
      return res.status(400).json({
        mensaje: `Stock insuficiente para: ${sinStock.join(', ')}`
      })
    }

    // ── Crear la orden con sus servicios ──────────────────────
    const orden = await prisma.ordenTrabajo.create({
      data: {
        clienteId:    cotizacion.clienteId,
        vehiculoId:   cotizacion.vehiculoId,
        mecanicoId:   mecanicoId  ?? null,
        kilometraje:  kilometraje ?? null,
        diagnostico:  diagnostico ?? cotizacion.notas ?? null,
        totalManoObra,
        creadoPorId:  req.usuario?.id ?? null,
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

    // ── Agregar refacciones en transacción atómica ────────────
    if (refaccionesItems.length > 0) {
      await prisma.$transaction(
        refaccionesItems.flatMap(item => {
          const ref = refacciones.find(r => r.id === item.refaccionId)!
          return [
            prisma.ordenDetalle.create({
              data: {
                ordenId:        orden.id,
                refaccionId:    item.refaccionId!,
                cantidad:       item.cantidad,
                precioUnitario: item.precioUnitario,
                costoSnapshot:  Number(ref.costoCompra),
                subtotal:       item.subtotal
              }
            }),
            prisma.refaccion.update({
              where: { id: item.refaccionId! },
              data:  { stockActual: { decrement: item.cantidad } }
            }),
            prisma.movimientoInventario.create({
              data: {
                refaccionId: item.refaccionId!,
                tipo:        'SALIDA',
                cantidad:    item.cantidad,
                motivo:      `Orden de trabajo (cotización #${cotizacion.numero})`
              }
            })
          ]
        })
      )
    }

    // ── Recalcular totales de la orden ────────────────────────
    const totalRefacciones = refaccionesItems.reduce(
      (s, i) => s + Number(i.subtotal), 0
    )
    const nuevoTotal = totalManoObra + totalRefacciones

    await prisma.ordenTrabajo.update({
      where: { id: orden.id },
      data: {
        totalRefacciones,
        total:          nuevoTotal,
        saldoPendiente: nuevoTotal
      }
    })

    // ── Marcar cotización como convertida ─────────────────────
    await prisma.cotizacion.update({
      where: { id: req.params.id as string },
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