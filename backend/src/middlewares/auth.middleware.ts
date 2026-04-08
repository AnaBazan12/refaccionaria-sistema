import { Request, Response, NextFunction } from 'express'
import { verificarToken } from '../utils/jwt'

export interface RequestConUsuario extends Request {
  usuario?: any
}

export const protegerRuta = (
  req: RequestConUsuario,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verificarToken(token)
    req.usuario = decoded
    next()
    console.log("Headers recibidos:", req.headers);
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' })
  }
}
// Middleware para proteger por rol
export const soloRoles = (...roles: string[]) => {
  return (req: RequestConUsuario, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'No autenticado' })
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`
      })
    }
    next()
  }
}