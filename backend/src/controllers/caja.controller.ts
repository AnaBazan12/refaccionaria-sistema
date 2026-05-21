import { Response } from 'express'
import { prisma } from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

export const resumenCaja = async (req: RequestConUsuario, res: Response) => {
  try {
    // fecha = 'YYYY-MM-DD', default hoy
    const fechaParam = (req.query.fecha as string) ?? new Date().toISOString().slice(0, 10)
    const inicio = new Date(`${fechaParam}T00:00:00.000Z`)
    const fin    = new Date(`${fechaParam}T23:59:59.999Z`)

    // ── Pagos de órdenes del día ───────────────────────────
    const pagos = await prisma.pago.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: {
        orden: {
          select: {
            numero:  true,
            cliente: { select: { nombre: true } },
            vehiculo: { select: { marca: true, modelo: true, placa: true } },
          }
        },
        usuario: { select: { nombre: true } }
      },
      orderBy: { fecha: 'asc' }
    })

    // ── Ventas mostrador del día ──────────────────────────
    const ventas = await prisma.ventaRefaccion.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
        tipoVenta: 'MOSTRADOR',
        ordenId:   null,          // solo ventas directas, no de órdenes
      },
      include: {
        refaccion: { select: { nombre: true, codigo: true } }
      },
      orderBy: { fecha: 'asc' }
    })

    // ── Agrupar pagos por método ──────────────────────────
    const porMetodo = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0 }
    for (const p of pagos) {
      const m = p.metodoPago as keyof typeof porMetodo
      porMetodo[m] = (porMetodo[m] ?? 0) + Number(p.monto)
    }

    // ── Agrupar pagos por tipo ────────────────────────────
    const porTipo = { CONTADO: 0, ANTICIPO: 0, ABONO: 0, CREDITO: 0 }
    for (const p of pagos) {
      const t = p.tipo as keyof typeof porTipo
      porTipo[t] = (porTipo[t] ?? 0) + Number(p.monto)
    }

    // ── Totales ventas mostrador ──────────────────────────
    const totalVentasMostrador = ventas.reduce((s, v) => s + Number(v.subtotal), 0)
    const totalPagosOrdenes    = pagos.reduce((s, p) => s + Number(p.monto), 0)
    const totalDia             = totalPagosOrdenes + totalVentasMostrador

    // ── Órdenes únicas que recibieron pago hoy ────────────
    const ordenesIds = [...new Set(pagos.map(p => p.ordenId))]
    const ordenesPagadas = ordenesIds.length

    return res.json({
      fecha:            fechaParam,
      totalDia,
      totalPagosOrdenes,
      totalVentasMostrador,
      ordenesPagadas,
      porMetodo,
      porTipo,
      pagos:            pagos.map(p => ({
        id:            p.id,
        hora:          p.fecha,
        tipo:          p.tipo,
        metodoPago:    p.metodoPago,
        monto:         Number(p.monto),
        notas:         p.notas,
        orden: {
          numero:      p.orden.numero,
          cliente:     p.orden.cliente?.nombre ?? '—',
          vehiculo:    p.orden.vehiculo
            ? `${p.orden.vehiculo.marca} ${p.orden.vehiculo.modelo ?? ''} · ${p.orden.vehiculo.placa}`.trim()
            : '—',
        },
        registradoPor: p.usuario?.nombre ?? '—',
      })),
      ventas: ventas.map(v => ({
        id:            v.id,
        hora:          v.fecha,
        refaccion:     v.refaccion.nombre,
        codigo:        v.refaccion.codigo,
        cantidad:      v.cantidad,
        precioUnit:    Number(v.precioUnitario),
        subtotal:      Number(v.subtotal),
        ganancia:      Number(v.ganancia),
      })),
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
