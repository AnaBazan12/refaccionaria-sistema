import { Request, Response } from 'express'
import {prisma} from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

// ── Registrar un pago (anticipo, abono o pago total) ──────────
export const registrarPago = async (
  req: RequestConUsuario,
  res: Response
) => {
  try {
    const { monto, tipo, notas } = req.body
    const ordenId = req.params.id

    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: ordenId as string}
    })
    if (!orden) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' })
    }
    if (Number(monto) <= 0) {
      return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' })
    }

    const totalPagadoNuevo  = Number(orden.totalPagado) + Number(monto)
    const saldoPendienteNuevo = Number(orden.total) - totalPagadoNuevo
    const estaPagada          = saldoPendienteNuevo <= 0
    
    // Determinar estado de pago
    let estadoPago = 'PARCIAL'
    if (estaPagada)                           estadoPago = 'PAGADO'
    else if (Number(orden.totalPagado) === 0) estadoPago = 'PENDIENTE'

    const [pago, ordenActualizada] = await prisma.$transaction([
      prisma.pago.create({
        data: {
          ordenId: ordenId as string,
          tipo,
          monto:     Number(monto),
          notas:     notas ?? null,
          usuarioId: req.usuario?.id  ?? null
        }
      }),
      prisma.ordenTrabajo.update({
        where: { id: ordenId as string },
        data: {
          totalPagado:   totalPagadoNuevo,
          saldoPendiente: Math.max(0, saldoPendienteNuevo),
          pagado:         estaPagada,
          estadoPago:     estadoPago as any
        }
      })
    ])

    return res.status(201).json({
      mensaje: 'Pago registrado',
      pago,
      resumen: {
        total:          fmt(orden.total),
        totalPagado:    fmt(totalPagadoNuevo),
        saldoPendiente: fmt(Math.max(0, saldoPendienteNuevo)),
        estadoPago
      }
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Obtener pagos de una orden ────────────────────────────────
export const obtenerPagos = async (req: Request, res: Response) => {
  try {
    const pagos = await prisma.pago.findMany({
      where: { ordenId: req.params.id as string},
      include: {
        usuario: { select: { nombre: true } }
      },
      orderBy: { fecha: 'asc' }
    })

    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: req.params.id as string },
      select: {
        total: true, totalPagado: true,
        saldoPendiente: true, estadoPago: true
      }
    })

    return res.json({ pagos, resumen: orden })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Clientes con saldo pendiente ──────────────────────────────
export const clientesConDeuda = async (_req: Request, res: Response) => {
  try {
    const ordenes = await prisma.ordenTrabajo.findMany({
      where: {
        saldoPendiente: { gt: 0 },
        estado:         'ENTREGADO',
        activo:         true
      },
      include: {
        cliente:  { select: { nombre: true, telefono: true } },
        vehiculo: { select: { placa: true, marca: true, modelo: true } },
        pagos:    true
      },
      orderBy: { saldoPendiente: 'desc' }
    })

    const totalDeuda = ordenes.reduce(
      (s, o) => s + Number(o.saldoPendiente), 0
    )

    return res.json({
      totalDeuda:    totalDeuda.toFixed(2),
      totalClientes: ordenes.length,
      ordenes
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

const fmt = (n: any) => Number(n ?? 0).toFixed(2)