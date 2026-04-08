import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'

/**
 * Obtener todos los clientes activos
 */
export const obtenerClientes = async (req: Request, res: Response) => {
  try {
    const { q } = req.query
    const where: any = { activo: true }

    if (q) {
      where.OR = [
        { nombre:   { contains: q as string, mode: 'insensitive' } },
        { telefono: { contains: q as string, mode: 'insensitive' } },
        { email:    { contains: q as string, mode: 'insensitive' } },
      ]
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { vehiculos: true, ordenes: true }
        }
      }
    })
    return res.json(clientes)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
/**
 * Obtener un cliente por ID
 */
export const obtenerClientePorId = async (req: Request, res: Response) => {
  try {
    // aseguramos que el id sea string
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id

    const cliente = await prisma.cliente.findUnique({
      where: { id } // aquí ya es string limpio
    })

    if (!cliente) {
      return res.status(404).json({
        mensaje: 'Cliente no encontrado'
      })
    }

    return res.json(cliente)
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error del servidor',
      error
    })
  }
}

/**
 * Crear un nuevo cliente
 */
export const crearCliente = async (req: Request, res: Response) => {
  try {
    const { nombre, telefono, email, direccion } = req.body

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        telefono,
        email,
        direccion
      }
    })

    return res.status(201).json({
      mensaje: 'Cliente creado',
      cliente
    })
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error del servidor',
      error
    })
  }
}

/**
 * Actualizar un cliente
 */
export const actualizarCliente = async (req: Request, res: Response) => {
  try {
    // 🔥 LIMPIEZA DEL ID (MISMO PROBLEMA)
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id

    const { nombre, telefono, email, direccion } = req.body

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre,
        telefono,
        email,
        direccion
      }
    })

    return res.json({
      mensaje: 'Cliente actualizado',
      cliente
    })
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error del servidor',
      error
    })
  }
}

/**
 * Eliminación lógica (soft delete)
 */
export const eliminarCliente = async (req: Request, res: Response) => {
  try {
    // 🔥 LIMPIEZA DEL ID
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id

    await prisma.cliente.update({
      where: { id },
      data: { activo: false } // no se elimina, solo se desactiva
    })

    return res.json({
      mensaje: 'Cliente eliminado correctamente'
    })
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error del servidor',
      error
    })
  }
}