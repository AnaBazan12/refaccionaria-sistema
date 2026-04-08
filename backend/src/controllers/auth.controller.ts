import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../utils/prisma'
import { generarToken } from '../utils/jwt'
import { RequestConUsuario } from '../middlewares/auth.middleware'

export const registrar = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, rol } = req.body

    const existe = await prisma.usuario.findUnique({ where: { email } })
    if (existe) {
      return res.status(400).json({ mensaje: 'El email ya está registrado' })
    }

    const hash = await bcrypt.hash(password, 10)

    const usuario = await prisma.usuario.create({
      data: { nombre, email, password: hash, rol },
      select: { id: true, nombre: true, email: true, rol: true, createdAt: true }
    })

    return res.status(201).json({ mensaje: 'Usuario creado', usuario })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' })
    }

    const passwordValido = await bcrypt.compare(password, usuario.password)
    if (!passwordValido) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' })
    }

    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    })
    
    

    return res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const obtenerUsurios = async (_req: Request, res: Response) => {
  try {
    const clientes = await prisma.usuario.findMany({
      where: { activo: true }, // solo clientes activos
      orderBy: { createdAt: 'desc' } // ordenados por fecha
    })

    return res.json(clientes)
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error del servidor',
      error
    })
  }
}
export const obtenerUsuarios = async (_req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true, nombre: true, email: true,
        rol: true, activo: true, createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return res.json(usuarios)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const toggleActivo = async (req: Request, res: Response) => {
  try {
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id  as string },
      data:  { activo: req.body.activo },
      select: { id: true, nombre: true, activo: true }
    })
    return res.json({ mensaje: 'Usuario actualizado', usuario })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
export const cambiarPassword = async (
  req: RequestConUsuario,
  res: Response
) => {
  try {
    const { passwordActual, passwordNuevo } = req.body

    if (!passwordNuevo || passwordNuevo.length < 6) {
      return res.status(400).json({
        mensaje: 'La nueva contraseña debe tener al menos 6 caracteres'
      })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id }
    })
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    }

    const passwordValido = await bcrypt.compare(
      passwordActual, usuario.password
    )
    if (!passwordValido) {
      return res.status(401).json({
        mensaje: 'La contraseña actual es incorrecta'
      })
    }

    const hash = await bcrypt.hash(passwordNuevo, 10)
    await prisma.usuario.update({
      where: { id: req.usuario!.id },
      data:  { password: hash }
    })

    return res.json({ mensaje: 'Contraseña actualizada correctamente' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}