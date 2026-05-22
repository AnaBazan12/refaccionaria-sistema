import { Response } from 'express'
import { prisma } from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

// ── Registrar gasto ───────────────────────────────────────────
export const registrarGasto = async (req: RequestConUsuario, res: Response) => {
  try {
    const { concepto, monto, categoria, metodoPago, notas } = req.body

    if (!concepto?.trim()) {
      return res.status(400).json({ mensaje: 'El concepto es obligatorio' })
    }
    if (!monto || Number(monto) <= 0) {
      return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' })
    }

    const gasto = await prisma.gastoCaja.create({
      data: {
        concepto:   concepto.trim(),
        monto:      Number(monto),
        categoria:  categoria  ?? 'OTROS',
        metodoPago: metodoPago ?? 'EFECTIVO',
        notas:      notas      ?? null,
        usuarioId:  req.usuario?.id ?? null,
      },
      include: { usuario: { select: { nombre: true } } }
    })

    return res.status(201).json({ mensaje: 'Gasto registrado', gasto })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Eliminar gasto ────────────────────────────────────────────
export const eliminarGasto = async (req: RequestConUsuario, res: Response) => {
  try {
    await prisma.gastoCaja.delete({
      where: { id: req.params.id as string }
    })
    return res.json({ mensaje: 'Gasto eliminado' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
