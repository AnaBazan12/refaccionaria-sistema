import { Response }           from 'express'
import { prisma }             from '../utils/prisma'
import { RequestConUsuario }  from '../middlewares/auth.middleware'

/* ── GET /api/config ─────────────────────────────────────────── */
export const getConfig = async (_req: RequestConUsuario, res: Response) => {
  try {
    // Upsert garantiza que siempre existe la fila singleton
    const config = await prisma.configNegocio.upsert({
      where:  { id: 'singleton' },
      update: {},
      create: {
        id:        'singleton',
        nombre:    process.env.NEGOCIO_NOMBRE    ?? 'Mi Taller',
        subtitulo: process.env.NEGOCIO_SUBTITULO ?? 'Servicio mecánico profesional',
        telefono:  process.env.NEGOCIO_TELEFONO  ?? '',
        direccion: process.env.NEGOCIO_DIRECCION ?? '',
        ciudad:    process.env.NEGOCIO_CIUDAD    ?? '',
        rfc:       '',
        email:     '',
        horario:   '',
      },
    })
    return res.json(config)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al obtener configuración', error })
  }
}

/* ── PUT /api/config ─────────────────────────────────────────── */
export const updateConfig = async (req: RequestConUsuario, res: Response) => {
  try {
    const { nombre, subtitulo, telefono, direccion, ciudad, rfc, email, horario } = req.body

    if (!nombre?.trim()) {
      return res.status(400).json({ mensaje: 'El nombre del negocio es requerido' })
    }

    const config = await prisma.configNegocio.upsert({
      where:  { id: 'singleton' },
      update: { nombre, subtitulo, telefono, direccion, ciudad, rfc, email, horario },
      create: { id: 'singleton', nombre, subtitulo, telefono, direccion, ciudad, rfc, email, horario },
    })

    return res.json({ mensaje: 'Configuración guardada', config })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al guardar configuración', error })
  }
}

/* ── PUT /api/config/logo ────────────────────────────────────── */
export const updateLogo = async (req: RequestConUsuario, res: Response) => {
  try {
    const { logo } = req.body  // base64 sin prefijo, o null para eliminar

    // Validar tamaño máximo ~1.5 MB en base64
    if (logo && logo.length > 2_000_000) {
      return res.status(400).json({ mensaje: 'La imagen es demasiado grande. Máximo ~1.5 MB.' })
    }

    const config = await prisma.configNegocio.upsert({
      where:  { id: 'singleton' },
      update: { logo: logo ?? null },
      create: { id: 'singleton', nombre: 'Mi Taller', logo: logo ?? null },
    })

    return res.json({ mensaje: 'Logo actualizado', logo: config.logo })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al actualizar logo', error })
  }
}
