import { Response } from 'express'
import { prisma }   from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

export const busquedaGlobal = async (req: RequestConUsuario, res: Response) => {
  try {
    const q = ((req.query.q as string) ?? '').trim()
    if (q.length < 2) return res.json({ clientes: [], ordenes: [], refacciones: [], vehiculos: [] })

    const like = { contains: q, mode: 'insensitive' as const }

    // Número de orden — puede ser búsqueda por número exacto
    const esNumero = /^\d+$/.test(q)

    const [clientes, ordenes, refacciones, vehiculos] = await Promise.all([

      // ── Clientes ────────────────────────────────────────────
      prisma.cliente.findMany({
        where: {
          activo: true,
          OR: [
            { nombre:   like },
            { telefono: like },
            { email:    like },
          ]
        },
        select: { id: true, nombre: true, telefono: true, email: true },
        take: 5,
      }),

      // ── Órdenes de trabajo ───────────────────────────────────
      prisma.ordenTrabajo.findMany({
        where: {
          activo: true,
          OR: [
            ...(esNumero ? [{ numero: parseInt(q) }] : []),
            { cliente:  { nombre: like } },
            { vehiculo: { placa:  like } },
            { vehiculo: { marca:  like } },
            { vehiculo: { modelo: like } },
            { diagnostico: like },
          ]
        },
        select: {
          id:           true,
          numero:       true,
          estado:       true,
          fechaIngreso: true,
          cliente:  { select: { nombre: true } },
          vehiculo: { select: { marca: true, modelo: true, placa: true } },
        },
        orderBy: { numero: 'desc' },
        take: 5,
      }),

      // ── Refacciones / Inventario ─────────────────────────────
      prisma.refaccion.findMany({
        where: {
          activo: true,
          OR: [
            { nombre:  like },
            { codigo:  like },
            { marca:   like },
          ]
        },
        select: {
          id:          true,
          codigo:      true,
          nombre:      true,
          stockActual: true,
          precioMostrador: true,
        },
        take: 5,
      }),

      // ── Vehículos ────────────────────────────────────────────
      prisma.vehiculo.findMany({
        where: {
          activo: true,
          OR: [
            { placa:  like },
            { marca:  like },
            { modelo: like },
          ]
        },
        select: {
          id:      true,
          placa:   true,
          marca:   true,
          modelo:  true,
          anio:    true,
          cliente: { select: { nombre: true } },
        },
        take: 5,
      }),
    ])

    const total = clientes.length + ordenes.length + refacciones.length + vehiculos.length

    return res.json({ clientes, ordenes, refacciones, vehiculos, total })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error en búsqueda', error })
  }
}
