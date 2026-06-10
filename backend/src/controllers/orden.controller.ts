import { Request, Response } from 'express'
import {prisma} from '../utils/prisma'
import { EstadoOrden } from '../generated/client'
import { RequestConUsuario } from '../middlewares/auth.middleware'

const incluirRelaciones = {
  cliente: { select: { id: true, nombre: true, telefono: true } },
  vehiculo: { select: { id: true, placa: true, marca: true, modelo: true, anio: true } },
  mecanico: { select: { id: true, nombre: true, especialidad: true } },
  servicios: {
    include: {
      servicio: { select: { id: true, nombre: true } }
    }
  }
}
// Obtener Ordenes
export const obtenerOrdenes = async (req: RequestConUsuario, res: Response) => {
  try {
    const { estado, pagado, archivadas, q, mecanicoId, fechaDesde, fechaHasta } = req.query
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const skip  = (page - 1) * limit

    const where: any = { activo: true }
    where.archivada = archivadas === 'true' ? true : false
    if (estado)            where.estado    = estado as EstadoOrden
    if (pagado !== undefined) where.pagado = pagado === 'true'
    if (mecanicoId)        where.mecanicoId = mecanicoId as string

    // Búsqueda por texto: placa, nombre de cliente o número de orden
    if (q && typeof q === 'string' && q.trim()) {
      const texto = q.trim()
      const numero = parseInt(texto)
      where.OR = [
        { cliente:  { nombre: { contains: texto, mode: 'insensitive' } } },
        { vehiculo: { placa:  { contains: texto, mode: 'insensitive' } } },
        ...(!isNaN(numero) ? [{ numero }] : []),
      ]
    }

    // Rango de fechas por createdAt
    if (fechaDesde || fechaHasta) {
      where.createdAt = {}
      if (fechaDesde) {
        const desde = new Date(fechaDesde as string)
        desde.setHours(0, 0, 0, 0)
        where.createdAt.gte = desde
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta as string)
        hasta.setHours(23, 59, 59, 999)
        where.createdAt.lte = hasta
      }
    }

    if (req.usuario?.rol === 'MECANICO') {
      const mecanico = await prisma.mecanico.findUnique({
        where: { usuarioId: req.usuario.id }
      })
      if (!mecanico) {
        return res.status(404).json({
          mensaje: 'Tu usuario no está vinculado a ningún mecánico.'
        })
      }
      where.mecanicoId = mecanico.id
    }

    const [ordenes, total] = await prisma.$transaction([
      prisma.ordenTrabajo.findMany({
        where,
        include: incluirRelaciones,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.ordenTrabajo.count({ where }),
    ])

    return res.json({
      data: ordenes,
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
// ── Obtener una orden por ID ───────────────────────────────
export const obtenerOrdenPorId = async (req: Request, res: Response) => {
  try {
    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: req.params.id as string },
      include: incluirRelaciones
    })
    if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' })
    return res.json(orden)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Obtener órdenes por vehículo (historial) ──────────────
export const obtenerOrdenesPorVehiculo = async (req: Request, res: Response) => {
  try {
    const ordenes = await prisma.ordenTrabajo.findMany({
      where: { vehiculoId: req.params.vehiculoId as string , activo: true },
      include: incluirRelaciones,
      orderBy: { createdAt: 'desc' }
    })
    return res.json(ordenes)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Crear orden ────────────────────────────────────────────
export const crearOrden = async (req: Request, res: Response) => {
  try {
    const {
      clienteId,
      vehiculoId,
      mecanicoId,
      kilometraje,
      diagnostico,
      observaciones,
      servicios  // [{ servicioId, cantidad, precioUnitario, notas }]
    } = req.body

    // Verificar que cliente y vehículo existen
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' })

    const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } })
    if (!vehiculo) return res.status(404).json({ mensaje: 'Vehículo no encontrado' })

    // Calcular totales de mano de obra
    let totalManoObra = 0
    const serviciosData = []

    if (servicios && servicios.length > 0) {
      for (const s of servicios) {
        const subtotal = s.cantidad * s.precioUnitario
        totalManoObra += subtotal
        serviciosData.push({
          servicioId: s.servicioId,
          cantidad: s.cantidad,
          precioUnitario: s.precioUnitario,
          subtotal,
          notas: s.notas
        })
      }
    }

    const total = totalManoObra

    const orden = await prisma.ordenTrabajo.create({
      data: {
        clienteId,
        vehiculoId,
        mecanicoId,
        kilometraje,
        diagnostico,
        observaciones,
        totalManoObra,
        total,
        servicios: {
          create: serviciosData
        }
      },
      include: incluirRelaciones
    })

    // Actualizar kilometraje del vehículo si se proporcionó
    if (kilometraje) {
      await prisma.vehiculo.update({
        where: { id: vehiculoId },
        data: { kilometraje }
      })
    }

    // ── WhatsApp de recepción ─────────────────────────────────
    let whatsapp: { url: string; mensaje: string } | null = null

    if (cliente.telefono) {
      let negocioNombre = process.env.NEGOCIO_NOMBRE   ?? 'el taller'
      let negocioTel    = process.env.NEGOCIO_TELEFONO ?? ''
      try {
        const cfg = await prisma.configNegocio.findUnique({ where: { id: 'singleton' } })
        if (cfg?.nombre)   negocioNombre = cfg.nombre
        if (cfg?.telefono) negocioTel    = cfg.telefono
      } catch { /* usa fallback */ }

      const tel   = cliente.telefono.replace(/\D/g, '')
      const auto  = `${vehiculo.marca} ${vehiculo.modelo}`
      const placa = vehiculo.placa
      const firma = negocioTel
        ? `_${negocioNombre}_ · ${negocioTel}`
        : `_${negocioNombre}_`

      const mensaje =
        `Hola ${cliente.nombre} 👋\n\n` +
        `Hemos recibido tu *${auto}* (${placa}) en nuestro taller.\n\n` +
        `Número de orden: *#${orden.numero}*\n\n` +
        `Te avisaremos en cuanto esté listo. ¡Gracias por tu confianza! 🔧\n\n` +
        firma

      whatsapp = {
        mensaje,
        url: `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`
      }
    }

    return res.status(201).json({ mensaje: 'Orden creada', orden, whatsapp })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const cambiarEstado = async (
  req: RequestConUsuario,
  res: Response
) => {
  try {
    const { estado, notas } = req.body

    const estadosValidos = Object.values(EstadoOrden)
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        mensaje: 'Estado inválido', estadosValidos
      })
    }

    const ordenActual = await prisma.ordenTrabajo.findUnique({
      where: { id: req.params.id as string}
    })
    if (!ordenActual) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' })
    }

    const data: any = {
      estado,
      modificadoPorId: req.usuario?.id ?? null
    }
    if (estado === 'ENTREGADO') data.fechaEntrega = new Date()

    // Actualizar orden + registrar en bitácora
    const [orden] = await prisma.$transaction([
      prisma.ordenTrabajo.update({
        where: { id: req.params.id as string},
        data,
        include: {
          ...incluirRelaciones,
          cliente:  { select: { id: true, nombre: true, telefono: true } },
          vehiculo: { select: { id: true, placa: true, marca: true, modelo: true, anio: true } },
        }
      }),
      prisma.bitacoraOrden.create({
        data: {
          ordenId:       req.params.id as string,
          estadoAntes:   ordenActual.estado,
          estadoDespues: estado,
          notas:         notas ?? null,
          usuarioId:     req.usuario?.id ?? null
        }
      })
    ])

    // ── WhatsApp automático al pasar a LISTO ──────────────────
    let whatsapp: { url: string; mensaje: string } | null = null

    if (estado === 'LISTO' && orden.cliente?.telefono) {
      // Leer nombre y teléfono del negocio desde BD (fallback a env vars)
      let negocioNombre = process.env.NEGOCIO_NOMBRE   ?? 'el taller'
      let negocioTel    = process.env.NEGOCIO_TELEFONO ?? ''
      try {
        const cfg = await prisma.configNegocio.findUnique({ where: { id: 'singleton' } })
        if (cfg?.nombre)   negocioNombre = cfg.nombre
        if (cfg?.telefono) negocioTel    = cfg.telefono
      } catch { /* usa fallback */ }

      const tel    = orden.cliente.telefono.replace(/\D/g, '')
      const nombre = orden.cliente.nombre
      const auto   = `${orden.vehiculo?.marca} ${orden.vehiculo?.modelo}`
      const placa  = orden.vehiculo?.placa ?? ''
      const saldo  = Number(orden.saldoPendiente)
      const fmt    = (n: number) =>
        `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      const firma  = negocioTel
        ? `_${negocioNombre}_ · ${negocioTel}`
        : `_${negocioNombre}_`

      const mensaje = saldo > 0
        ? `Hola ${nombre} 👋\n\nTu *${auto}* (${placa}) ya está *listo para recoger* 🔧✅\n\n*Total del servicio:* ${fmt(Number(orden.total))}\n*Saldo pendiente:* ${fmt(saldo)}\n\nTe esperamos en el taller. ¡Gracias por tu preferencia!\n\n${firma}`
        : `Hola ${nombre} 👋\n\nTu *${auto}* (${placa}) ya está *listo para recoger* 🔧✅\n\n*Total:* ${fmt(Number(orden.total))} ✓ _Pagado_\n\nTe esperamos en el taller. ¡Gracias por tu preferencia!\n\n${firma}`

      whatsapp = {
        mensaje,
        url: `https://wa.me/52${tel}?text=${encodeURIComponent(mensaje)}`
      }
    }

    return res.json({ mensaje: 'Estado actualizado', orden, whatsapp })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Marcar como pagada ─────────────────────────────────────
export const marcarPagada = async (req: Request, res: Response) => {
  try {
    const orden = await prisma.ordenTrabajo.update({
      where: { id: req.params.id as string },
      data: { pagado: true },
      include: incluirRelaciones
    })
    return res.json({ mensaje: 'Orden marcada como pagada', orden })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Agregar servicio a una orden existente ─────────────────
export const agregarServicio = async (req: Request, res: Response) => {
  try {
    const { servicioId, cantidad, precioUnitario, notas } = req.body
    const subtotal = cantidad * precioUnitario
       await prisma.ordenServicio.create({
        data: {
        ordenId: req.params.id as string,
        servicioId,
        cantidad,
        precioUnitario,
        subtotal,
        notas
      }
    })
    // Recalcular totales
    const servicios = await prisma.ordenServicio.findMany({
      where: { ordenId: req.params.id as string}
    })

    const totalManoObra = servicios.reduce(
      (sum, s) => sum + Number(s.subtotal), 0
    )

    const orden = await prisma.ordenTrabajo.update({
      where: { id: req.params.id as string },
      data: {
        totalManoObra,
        total: totalManoObra
      },
      include: incluirRelaciones
    })

    return res.json({ mensaje: 'Servicio agregado', orden })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Cancelar orden ─────────────────────────────────────────
export const cancelarOrden = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string

    // Obtener detalles de refacciones para devolver stock
    const detalles = await prisma.ordenDetalle.findMany({
      where: { ordenId: id },
      include: { orden: { select: { numero: true } } }
    })

    // Transacción: cancelar orden + devolver stock de cada refacción
    await prisma.$transaction([
      // 1. Cancelar la orden
      prisma.ordenTrabajo.update({
        where: { id },
        data: { estado: 'CANCELADO', activo: false }
      }),

      // 2. Devolver stock de cada refacción usada
      ...detalles.map(d =>
        prisma.refaccion.update({
          where: { id: d.refaccionId },
          data:  { stockActual: { increment: d.cantidad } }
        })
      ),

      // 3. Registrar movimientos de devolución
      ...detalles.map(d =>
        prisma.movimientoInventario.create({
          data: {
            refaccionId: d.refaccionId,
            tipo:        'ENTRADA',
            cantidad:    d.cantidad,
            motivo:      `Cancelación de orden #${d.orden.numero}`
          }
        })
      )
    ])

    return res.json({
      mensaje: `Orden cancelada${detalles.length > 0
        ? `. Se devolvió stock de ${detalles.length} refacción${detalles.length !== 1 ? 'es' : ''}`
        : ''
      }`
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
// ── Archivar orden manualmente ────────────────────────────
export const archivarOrden = async (req: Request, res: Response) => {
  try {
    const orden = await prisma.ordenTrabajo.update({
      where: { id: req.params.id as string},
      data:  { archivada: true }
    })
    return res.json({ mensaje: 'Orden archivada', orden })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Archivar automáticamente órdenes viejas ───────────────
// Archiva todas las órdenes ENTREGADAS y PAGADAS de más de X días
export const archivarOrdeneViejas = async (req: Request, res: Response) => {
  try {
    const dias = Number(req.query.dias) || 30

    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - dias)

    const resultado = await prisma.ordenTrabajo.updateMany({
      where: {
        estado:    'ENTREGADO',
        pagado:    true,
        archivada: false,
        fechaEntrega: { lte: fechaLimite }
      },
      data: { archivada: true }
    })

    return res.json({
      mensaje:   `${resultado.count} órdenes archivadas`,
      archivadas: resultado.count
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
// ── Actualizar campos editables de la orden (mecánico / recepcionista) ────────
export const actualizarOrden = async (req: RequestConUsuario, res: Response) => {
  try {
    const { diagnostico, observaciones, kilometraje, mecanicoId } = req.body

    const actualizable: any = {}
    if (diagnostico   !== undefined) actualizable.diagnostico   = diagnostico   ?? null
    if (observaciones !== undefined) actualizable.observaciones = observaciones ?? null
    if (kilometraje   !== undefined) actualizable.kilometraje   = kilometraje   ? Number(kilometraje) : null
    if (mecanicoId    !== undefined) actualizable.mecanicoId    = mecanicoId    ?? null
    if (req.usuario?.id)             actualizable.modificadoPorId = req.usuario.id

    if (Object.keys(actualizable).length === 0) {
      return res.status(400).json({ mensaje: 'No hay campos para actualizar' })
    }

    const orden = await prisma.ordenTrabajo.update({
      where: { id: req.params.id as string },
      data:  actualizable,
    })
    return res.json({ mensaje: 'Orden actualizada', orden })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Eliminar orden permanentemente (solo ADMIN) ───────────────
export const eliminarOrden = async (req: RequestConUsuario, res: Response) => {
  try {
    const id = req.params.id as string

    const orden = await prisma.ordenTrabajo.findUnique({
      where:   { id },
      include: {
        detalle: true,
        pagos:   true,
      }
    })
    if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' })

    // Bloquear si tiene pagos registrados — el admin debe resolverlo primero
    if (orden.pagos.length > 0) {
      return res.status(400).json({
        mensaje: `No se puede eliminar: la orden tiene ${orden.pagos.length} pago(s) registrado(s). Cancela los pagos primero o usa la opción de cancelar.`
      })
    }

    // Transacción: eliminar orden + revertir stock de refacciones usadas
    await prisma.$transaction([
      // Revertir stock de cada refacción del detalle
      ...orden.detalle.map(d =>
        prisma.refaccion.update({
          where: { id: d.refaccionId },
          data:  { stockActual: { increment: d.cantidad } }
        })
      ),
      // Registrar movimientos de devolución
      ...orden.detalle.map(d =>
        prisma.movimientoInventario.create({
          data: {
            refaccionId: d.refaccionId,
            tipo:        'ENTRADA',
            cantidad:    d.cantidad,
            motivo:      `Eliminación de orden #${orden.numero}`
          }
        })
      ),
      // Eliminar la orden (cascade borra detalle, servicios, bitácora)
      prisma.ordenTrabajo.delete({ where: { id } })
    ] as any[])

    return res.json({ mensaje: `Orden #${orden.numero} eliminada permanentemente` })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const obtenerBitacora = async (req: Request, res: Response) => {
  try {
    const bitacora = await prisma.bitacoraOrden.findMany({
      where:   { ordenId: req.params.id as string},
      include: { usuario: { select: { nombre: true } } },
      orderBy: { fecha:   'asc' }
    })
    return res.json(bitacora)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── PATCH /ordenes/:id/garantia ───────────────────────────────
export const actualizarGarantia = async (req: Request, res: Response) => {
  try {
    const id     = String(req.params.id)
    const meses  = Number(req.body.garantiaMeses)

    if (isNaN(meses) || meses < 0) {
      return res.status(400).json({ mensaje: 'Meses de garantía inválido' })
    }

    const orden = await prisma.ordenTrabajo.findUnique({ where: { id } })
    if (!orden) return res.status(404).json({ mensaje: 'Orden no encontrada' })

    // Calcular fecha de vencimiento a partir de la entrega (o hoy si no hay)
    let garantiaVence: Date | null = null
    if (meses > 0) {
      const base = orden.fechaEntrega ?? new Date()
      garantiaVence = new Date(base)
      garantiaVence.setMonth(garantiaVence.getMonth() + meses)
    }

    const actualizada = await prisma.ordenTrabajo.update({
      where: { id },
      data:  { garantiaMeses: meses > 0 ? meses : null, garantiaVence },
    })

    return res.json({
      garantiaMeses: actualizada.garantiaMeses,
      garantiaVence: actualizada.garantiaVence,
    })
  } catch (err) {
    return res.status(500).json({ mensaje: 'Error del servidor', error: err })
  }
}