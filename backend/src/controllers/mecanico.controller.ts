import { Request, Response } from 'express'
import {prisma} from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

export const obtenerMecanicos = async (_req: Request, res: Response) => {
  try {
    const mecanicos = await prisma.mecanico.findMany({
      where: { activo: true },
      include: {
        usuario: { select: { id: true, email: true, activo: true } }
      },
      orderBy: { nombre: 'asc' }
    })
    return res.json(mecanicos)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const obtenerMecanicoPorId = async (req: Request, res: Response) => {
  try {
    const mecanico = await prisma.mecanico.findUnique({
      where: { id: req.params.id as string},
      include: {
        usuario: { select: { id: true, email: true } }
      }
    })
    if (!mecanico) return res.status(404).json({ mensaje: 'Mecánico no encontrado' })
    return res.json(mecanico)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const crearMecanico = async (req: Request, res: Response) => {
  try {
    const { nombre, telefono, especialidad, usuarioId } = req.body

    // Si viene usuarioId verificar que existe y es rol MECANICO
    if (usuarioId) {
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId }
      })
      if (!usuario) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' })
      }
      if (usuario.rol !== 'MECANICO') {
        return res.status(400).json({
          mensaje: 'El usuario debe tener rol MECANICO'
        })
      }
    }

    const mecanico = await prisma.mecanico.create({
      data: { nombre, telefono, especialidad, usuarioId: usuarioId ?? null },
      include: {
        usuario: { select: { id: true, email: true } }
      }
    })
    return res.status(201).json({ mensaje: 'Mecánico registrado', mecanico })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({
        mensaje: 'Ese usuario ya está vinculado a otro mecánico'
      })
    }
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const actualizarMecanico = async (req: Request, res: Response) => {
  try {
    const { nombre, telefono, especialidad, usuarioId } = req.body
    const mecanico = await prisma.mecanico.update({
      where: { id: req.params.id as string},
      data: { nombre, telefono, especialidad, usuarioId: usuarioId ?? null },
      include: {
        usuario: { select: { id: true, email: true } }
      }
    })
    return res.json({ mensaje: 'Mecánico actualizado', mecanico })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const eliminarMecanico = async (req: Request, res: Response) => {
  try {
    await prisma.mecanico.update({
      where: { id: req.params.id  as string },
      data: { activo: false }
    })
    return res.json({ mensaje: 'Mecánico eliminado correctamente' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}