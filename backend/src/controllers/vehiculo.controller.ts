import { Request, Response } from 'express'
import {prisma} from '../utils/prisma'

// Obtener todos los vehículos (con datos del cliente)
export const obtenerVehiculos = async (_req: Request, res: Response) => {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      where: { activo: true },
      include: {
        cliente: {
          select: { id: true, nombre: true, telefono: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return res.json(vehiculos)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// Obtener un vehículo por ID
export const obtenerVehiculoPorId = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id)
    // Aseguramos que el id sea string
      ? req.params.id[0]
      : req.params.id
  try {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { id: true, nombre: true, telefono: true, email: true }
        }
      }
    })
    if (!vehiculo) return res.status(404).json({ mensaje: 'Vehículo no encontrado' })
    return res.json(vehiculo)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// Obtener todos los vehículos de un cliente específico
export const obtenerVehiculosPorCliente = async (req: Request, res: Response) => {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      where: {
        clienteId: req.params.clienteId as string,
        activo: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return res.json(vehiculos)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// Buscar por placa
export const buscarPorPlaca = async (req: Request, res: Response) => {
  try {
   const placa = req.params.placa as string

   const vehiculo = await prisma.vehiculo.findUnique({
   where: { placa: placa.toUpperCase() },
   include: {
    cliente: {
      select: { id: true, nombre: true, telefono: true }
    }
   }
 })
    if (!vehiculo) return res.status(404).json({ mensaje: 'Vehículo no encontrado' })
    return res.json(vehiculo)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
// Crear vehículo
export const crearVehiculo = async (req: Request, res: Response) => {
  try {
    const { placa, marca, modelo, anio, color, numSerie, kilometraje, notas, clienteId } = req.body

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' })

    const vehiculo = await prisma.vehiculo.create({
      data: {
        placa: placa.toUpperCase(),
        marca,
        modelo,
        anio,
        color,
        numSerie,
        kilometraje,
        notas,
        clienteId
      },
      include: {
        cliente: { select: { id: true, nombre: true } }
      }
    })

    return res.status(201).json({ mensaje: 'Vehículo registrado', vehiculo })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ mensaje: 'La placa o número de serie ya existe' })
    }
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// Actualizar vehículo (incluyendo kilometraje al recibir el auto)
export const actualizarVehiculo = async (req: Request, res: Response) => {
  try {
    const { placa, marca, modelo, anio, color, numSerie, kilometraje, notas } = req.body
    const id = Array.isArray(req.params.id)
    // Aseguramos que el id sea string
      ? req.params.id[0]
      : req.params.id
    const vehiculo = await prisma.vehiculo.update({
      where: { id  },
      data: {
        ...(placa && { placa: placa.toUpperCase() }),
        marca, modelo, anio, color, numSerie, kilometraje, notas
      }
    })

    return res.json({ mensaje: 'Vehículo actualizado', vehiculo })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// Eliminar vehículo (borrado suave)
export const eliminarVehiculo = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id)
    // Aseguramos que el id sea string
      ? req.params.id[0]
      : req.params.id
  try {
    await prisma.vehiculo.update({
      where: { id } ,
      data: { activo: false }
    })
    return res.json({ mensaje: 'Vehículo eliminado correctamente' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}