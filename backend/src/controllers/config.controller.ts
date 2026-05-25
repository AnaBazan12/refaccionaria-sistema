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
