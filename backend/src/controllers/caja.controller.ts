import { Response } from 'express'
import { prisma } from '../utils/prisma'
import { RequestConUsuario } from '../middlewares/auth.middleware'

export const resumenCaja = async (req: RequestConUsuario, res: Response) => {
  try {
    // fecha = 'YYYY-MM-DD', default hoy en hora de México (UTC-6)
    // México abolió el horario de verano en 2023 → siempre UTC-6
    const ahora = new Date()
    const hoyMexico = new Date(ahora.getTime() - 6 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)
    const fechaParam = (req.query.fecha as string) ?? hoyMexico

    // Rango del día completo en México (UTC-6): medianoche a medianoche local
    const inicio = new Date(`${fechaParam}T00:00:00-06:00`)
    const fin    = new Date(`${fechaParam}T23:59:59.999-06:00`)

    // ── Pagos, ventas y gastos del día (paralelo) ─────────
    const [pagos, ventas, gastos] = await Promise.all([

    // ── Pagos de órdenes del día ───────────────────────────
    prisma.pago.findMany({
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

    ,

    // ── Ventas mostrador del día ──────────────────────────
    prisma.ventaRefaccion.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
        tipoVenta: 'MOSTRADOR',
        ordenId:   null,
      },
      include: {
        refaccion: { select: { nombre: true, codigo: true } }
      },
      orderBy: { fecha: 'asc' }
    }),

    // ── Gastos del día ────────────────────────────────────
    prisma.gastoCaja.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { fecha: 'asc' }
    }),

    ])

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

    // ── Totales ───────────────────────────────────────────
    const totalVentasMostrador = ventas.reduce((s, v) => s + Number(v.subtotal), 0)
    const totalPagosOrdenes    = pagos.reduce((s, p) => s + Number(p.monto), 0)
    const totalIngresos        = totalPagosOrdenes + totalVentasMostrador
    const totalGastos          = gastos.reduce((s, g) => s + Number(g.monto), 0)
    const utilidadNeta         = totalIngresos - totalGastos

    // ── Gastos por categoría ──────────────────────────────
    const porCategoria = { REFACCIONES: 0, NOMINA: 0, SERVICIOS: 0, OTROS: 0 }
    for (const g of gastos) {
      const c = g.categoria as keyof typeof porCategoria
      porCategoria[c] = (porCategoria[c] ?? 0) + Number(g.monto)
    }

    // ── Órdenes únicas que recibieron pago hoy ────────────
    const ordenesIds = [...new Set(pagos.map(p => p.ordenId))]
    const ordenesPagadas = ordenesIds.length

    return res.json({
      fecha:            fechaParam,
      totalDia:         totalIngresos,
      totalPagosOrdenes,
      totalVentasMostrador,
      totalGastos,
      utilidadNeta,
      ordenesPagadas,
      porMetodo,
      porTipo,
      porCategoria,
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
      gastos: gastos.map(g => ({
        id:            g.id,
        hora:          g.fecha,
        concepto:      g.concepto,
        categoria:     g.categoria,
        metodoPago:    g.metodoPago,
        monto:         Number(g.monto),
        notas:         g.notas,
        registradoPor: g.usuario?.nombre ?? '—',
      })),
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
