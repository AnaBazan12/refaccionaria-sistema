import { Request, Response } from 'express'
import {prisma} from '../utils/prisma'

export const obtenerServicios = async (_req: Request, res: Response) => {
  try {
    const servicios = await prisma.tipoServicio.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })
    return res.json(servicios)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const obtenerServicioPorId = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id)
    // Aseguramos que el id sea string
      ? req.params.id[0]
      : req.params.id
  try {
    const servicio = await prisma.tipoServicio.findUnique({
      where: { id }
    })
    if (!servicio) return res.status(404).json({ mensaje: 'Servicio no encontrado' })
    return res.json(servicio)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const crearServicio = async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, precioBase } = req.body
    const servicio = await prisma.tipoServicio.create({
      data: { nombre, descripcion, precioBase }
    })
    return res.status(201).json({ mensaje: 'Servicio creado', servicio })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ mensaje: 'Ya existe un servicio con ese nombre' })
    }
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const actualizarServicio = async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, precioBase } = req.body
    const id = Array.isArray(req.params.id)
    // Aseguramos que el id sea string
      ? req.params.id[0]
      : req.params.id
    const servicio = await prisma.tipoServicio.update({
      where: { id },
      data: { nombre, descripcion, precioBase }
    })
    return res.json({ mensaje: 'Servicio actualizado', servicio })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const eliminarServicio = async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id)
    // Aseguramos que el id sea string
      ? req.params.id[0]
      : req.params.id
  try {
    await prisma.tipoServicio.update({
      where: { id},
      data: { activo: false }
    })
    return res.json({ mensaje: 'Servicio eliminado correctamente' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}