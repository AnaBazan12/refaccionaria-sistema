/**
 * Historial público de un vehículo por placa
 * Ruta pública — sin autenticación requerida
 */
import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'

export async function historialVehiculo(req: Request, res: Response) {
  try {
    const placa = String(req.params.placa).toUpperCase().trim()

    // Buscar vehículo por placa
    const vehiculo = await prisma.vehiculo.findFirst({
      where: { placa },
      include: {
        cliente: { select: { nombre: true } },
        ordenes: {
          where:   { activo: true },
          orderBy: { fechaIngreso: 'desc' },
          include: {
            servicios: {
              include: { servicio: { select: { nombre: true } } },
            },
            mecanico: { select: { nombre: true } },
          },
        },
      },
    })

    if (!vehiculo) {
      res.status(404).json({ mensaje: 'Vehículo no encontrado' })
      return
    }

    // Config del negocio para mostrar en la página
    const cfg = await prisma.configNegocio.findUnique({ where: { id: 'singleton' } })

    const negocio = {
      nombre:    cfg?.nombre    ?? 'Taller Mecánico',
      subtitulo: cfg?.subtitulo ?? '',
      telefono:  cfg?.telefono  ?? '',
      direccion: cfg?.direccion ?? '',
      ciudad:    cfg?.ciudad    ?? '',
      logo:      cfg?.logo      ?? null,
    }

    const ordenes = vehiculo.ordenes.map(o => ({
      numero:       o.numero,
      estado:       o.estado,
      estadoPago:   o.estadoPago,
      fechaIngreso: o.fechaIngreso,
      fechaEntrega: o.fechaEntrega,
      kilometraje:  o.kilometraje,
      diagnostico:  o.diagnostico,
      observaciones:o.observaciones,
      total:        Number(o.total),
      mecanico:     o.mecanico?.nombre ?? null,
      servicios:    o.servicios.map(s => s.servicio.nombre),
    }))

    res.json({
      vehiculo: {
        placa:  vehiculo.placa,
        marca:  vehiculo.marca,
        modelo: vehiculo.modelo,
        anio:   vehiculo.anio,
        color:  vehiculo.color,
        cliente:vehiculo.cliente.nombre,
      },
      ordenes,
      negocio,
    })
  } catch (err: any) {
    console.error('Error historial:', err)
    res.status(500).json({ mensaje: 'Error interno' })
  }
}
