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
    const { estado, pagado, archivadas } = req.query
    const where: any = { activo: true }

    // Por defecto ocultar archivadas — solo mostrar si se pide explícitamente
    where.archivada = archivadas === 'true' ? true : false

    if (estado) where.estado = estado as EstadoOrden
    if (pagado !== undefined) where.pagado = pagado === 'true'

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

    const ordenes = await prisma.ordenTrabajo.findMany({
      where,
      include: incluirRelaciones,
      orderBy: { createdAt: 'desc' }
    })

    return res.json(ordenes)
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

    return res.status(201).json({ mensaje: 'Orden creada', orden })
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
        include: incluirRelaciones
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

    return res.json({ mensaje: 'Estado actualizado', orden })
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
    const orden = await prisma.ordenTrabajo.update({
      where: { id: req.params.id as string },
      data: { estado: 'CANCELADO', activo: false }
    })
    return res.json({ mensaje: 'Orden cancelada', orden })
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