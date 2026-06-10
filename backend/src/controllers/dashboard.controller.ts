import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const ahora  = new Date()
    const hoy    = new Date(ahora); hoy.setHours(0, 0, 0, 0)
    const finHoy = new Date(ahora); finHoy.setHours(23, 59, 59, 999)

    // ── Mes actual ───────────────────────────────────────────────
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)

    // ── Mes anterior ─────────────────────────────────────────────
    const inicioMesAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    const finMesAnt    = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)

    // ── Últimos 7 días ───────────────────────────────────────────
    const hace7 = new Date(ahora)
    hace7.setDate(hace7.getDate() - 6)
    hace7.setHours(0, 0, 0, 0)

    // ── Consultas en paralelo ─────────────────────────────────────
    const [
      ordenesMes,
      ordenesMesAnt,
      ordenesActivas,
      pagosUltimos7,
      stockBajoRaw,
      ultimasOrdenes,
      ventasHoy,
      ventasMes,
      ventasUltimos7,
      comprasMes,
      cotizacionesPendientes,
      cotizacionesAprobadas,
      deudasLista,
      deudasAgregado,
    ] = await Promise.all([

      // Órdenes del mes actual
      prisma.ordenTrabajo.findMany({
        where: { createdAt: { gte: inicioMes, lte: finMes }, activo: true },
        include: { mecanico: { select: { nombre: true } } }
      }),

      // Órdenes del mes anterior (solo entregadas para comparar ingresos)
      prisma.ordenTrabajo.findMany({
        where: {
          createdAt: { gte: inicioMesAnt, lte: finMesAnt },
          estado: 'ENTREGADO',
          activo: true
        },
        select: { total: true }
      }),

      // Órdenes activas (en taller ahora mismo)
      prisma.ordenTrabajo.findMany({
        where: {
          estado: { in: ['RECIBIDO', 'EN_PROCESO', 'EN_ESPERA_REFACCION', 'LISTO'] },
          activo: true
        },
        include: {
          cliente:  { select: { nombre: true } },
          vehiculo: { select: { placa: true, marca: true, modelo: true } },
          mecanico: { select: { nombre: true } }
        },
        orderBy: { createdAt: 'asc' }
      }),

      // Pagos de taller últimos 7 días (gráfica)
      prisma.pago.findMany({
        where: { fecha: { gte: hace7, lte: finHoy } },
        select: { monto: true, fecha: true }
      }),

      // Refacciones con stock bajo
      prisma.refaccion.findMany({
        where: { activo: true },
        select: {
          id: true, nombre: true, codigo: true,
          stockActual: true, stockMinimo: true,
          proveedor: { select: { nombre: true } }
        }
      }),

      // Últimas 5 órdenes creadas
      prisma.ordenTrabajo.findMany({
        where: { activo: true },
        include: {
          cliente:  { select: { nombre: true } },
          vehiculo: { select: { marca: true, modelo: true, placa: true } },
          mecanico: { select: { nombre: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),

      // ── NUEVO: Ventas de refacciones de HOY ─────────────────
      prisma.ventaRefaccion.findMany({
        where: { fecha: { gte: hoy, lte: finHoy } },
        select: { subtotal: true, ganancia: true, tipoVenta: true }
      }),

      // ── NUEVO: Ventas de refacciones del MES ────────────────
      prisma.ventaRefaccion.findMany({
        where: { fecha: { gte: inicioMes, lte: finMes } },
        select: { subtotal: true, ganancia: true, tipoVenta: true, fecha: true }
      }),

      // ── NUEVO: Ventas por día últimos 7 (para gráfica doble) ─
      prisma.ventaRefaccion.findMany({
        where: { fecha: { gte: hace7, lte: finHoy } },
        select: { subtotal: true, fecha: true }
      }),

      // ── NUEVO: Compras del mes ───────────────────────────────
      prisma.compra.findMany({
        where: { fecha: { gte: inicioMes, lte: finMes } },
        select: { total: true }
      }),

      // ── Cotizaciones pendientes ──────────────────────────────
      prisma.cotizacion.count({ where: { estado: 'PENDIENTE' } }),

      // ── Cotizaciones aprobadas (listas para convertir) ───────
      prisma.cotizacion.count({ where: { estado: 'APROBADA' } }),

      // ── Órdenes con saldo pendiente (deudas) ─────────────────
      prisma.ordenTrabajo.findMany({
        where: { saldoPendiente: { gt: 0 }, activo: true },
        select: {
          id:             true,
          numero:         true,
          saldoPendiente: true,
          cliente:        { select: { nombre: true } },
          vehiculo:       { select: { marca: true, modelo: true, placa: true } },
        },
        orderBy: { saldoPendiente: 'desc' },
        take: 8,
      }),

      // ── Total adeudado global ─────────────────────────────────
      prisma.ordenTrabajo.aggregate({
        where: { saldoPendiente: { gt: 0 }, activo: true },
        _sum:   { saldoPendiente: true },
        _count: { id: true },
      }),
    ])

    // ── Métricas del mes actual ───────────────────────────────────
    const entregadasMes   = ordenesMes.filter(o => o.estado === 'ENTREGADO')
    const ingresosMes     = entregadasMes.reduce((s, o) => s + Number(o.total), 0)
    const ingresosMesAnt  = ordenesMesAnt.reduce((s, o) => s + Number(o.total), 0)
    const crecimiento     = ingresosMesAnt > 0
      ? (((ingresosMes - ingresosMesAnt) / ingresosMesAnt) * 100).toFixed(1)
      : null

    // Órdenes de hoy (nuevas)
    const ordenesHoy = ordenesMes.filter(
      o => new Date(o.createdAt) >= hoy && new Date(o.createdAt) <= finHoy
    ).length

    // ── Conteo por estado ────────────────────────────────────────
    const porEstado = {
      RECIBIDO:            ordenesActivas.filter(o => o.estado === 'RECIBIDO').length,
      EN_PROCESO:          ordenesActivas.filter(o => o.estado === 'EN_PROCESO').length,
      EN_ESPERA_REFACCION: ordenesActivas.filter(o => o.estado === 'EN_ESPERA_REFACCION').length,
      LISTO:               ordenesActivas.filter(o => o.estado === 'LISTO').length,
    }

    // ── Productividad mecánicos (mes actual) ──────────────────────
    const mecMap: Record<string, { nombre: string; ordenes: number; ingresos: number }> = {}
    for (const o of entregadasMes) {
      if (!o.mecanicoId || !o.mecanico) continue
      if (!mecMap[o.mecanicoId]) {
        mecMap[o.mecanicoId] = { nombre: o.mecanico.nombre, ordenes: 0, ingresos: 0 }
      }
      mecMap[o.mecanicoId].ordenes++
      mecMap[o.mecanicoId].ingresos += Number(o.totalManoObra)
    }
    const mecanicos = Object.values(mecMap).sort((a, b) => b.ordenes - a.ordenes)

    // ── Gráfica últimos 7 días (taller + ventas mostrador) ───────
    const ultimos7: {
      fecha: string; ingresos: number; ventas: number; label: string
    }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ahora)
      d.setDate(d.getDate() - i)
      const dStr = d.toISOString().split('T')[0]

      const ingresos = pagosUltimos7
        .filter(p => p.fecha.toISOString().split('T')[0] === dStr)
        .reduce((s, p) => s + Number(p.monto), 0)

      const ventas = ventasUltimos7
        .filter(v => v.fecha.toISOString().split('T')[0] === dStr)
        .reduce((s, v) => s + Number(v.subtotal), 0)

      ultimos7.push({
        fecha:    dStr,
        ingresos: parseFloat(ingresos.toFixed(2)),
        ventas:   parseFloat(ventas.toFixed(2)),
        label:    d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
      })
    }

    // ── Ventas HOY ───────────────────────────────────────────────
    const totalVentasHoy    = ventasHoy.reduce((s, v) => s + Number(v.subtotal), 0)
    const gananciaVentasHoy = ventasHoy.reduce((s, v) => s + Number(v.ganancia), 0)

    // ── Ventas MES ───────────────────────────────────────────────
    const totalVentasMes    = ventasMes.reduce((s, v) => s + Number(v.subtotal), 0)
    const gananciaVentasMes = ventasMes.reduce((s, v) => s + Number(v.ganancia), 0)

    // Ventas mes por tipo
    const ventasPorTipo: Record<string, { total: number; ganancia: number; cantidad: number }> = {}
    for (const v of ventasMes) {
      if (!ventasPorTipo[v.tipoVenta]) {
        ventasPorTipo[v.tipoVenta] = { total: 0, ganancia: 0, cantidad: 0 }
      }
      ventasPorTipo[v.tipoVenta].total    += Number(v.subtotal)
      ventasPorTipo[v.tipoVenta].ganancia += Number(v.ganancia)
      ventasPorTipo[v.tipoVenta].cantidad += 1
    }

    // ── Compras MES ──────────────────────────────────────────────
    const totalComprasMes = comprasMes.reduce((s, c) => s + Number(c.total), 0)

    // ── Stock bajo ───────────────────────────────────────────────
    const stockBajo = stockBajoRaw.filter(r => r.stockActual <= r.stockMinimo)

    // ── Deudas ───────────────────────────────────────────────────
    const totalDeudas = Number(deudasAgregado._sum.saldoPendiente ?? 0)
    const countDeudas = deudasAgregado._count.id

    return res.json({
      hoy: {
        nuevasOrdenes:   ordenesHoy,
        enTaller:        ordenesActivas.length,
        ventasTotal:     totalVentasHoy.toFixed(2),
        ventasGanancia:  gananciaVentasHoy.toFixed(2),
        ventasCount:     ventasHoy.length,
      },
      cotizaciones: {
        pendientes: cotizacionesPendientes,
        aprobadas:  cotizacionesAprobadas,
      },
      mes: {
        ingresos:        ingresosMes.toFixed(2),
        ingresosMesAnt:  ingresosMesAnt.toFixed(2),
        crecimiento,
        totalOrdenes:    ordenesMes.length,
        entregadas:      entregadasMes.length,
        ventasTotal:     totalVentasMes.toFixed(2),
        ventasGanancia:  gananciaVentasMes.toFixed(2),
        ventasPorTipo,
        comprasTotal:    totalComprasMes.toFixed(2),
      },
      activas: {
        total:     ordenesActivas.length,
        porEstado,
        lista:     ordenesActivas,
      },
      mecanicos,
      ultimos7,
      ultimasOrdenes,
      stockBajo: stockBajo.map(r => ({
        id:          r.id,
        nombre:      r.nombre,
        codigo:      r.codigo,
        stockActual: r.stockActual,
        stockMinimo: r.stockMinimo,
        proveedor:   r.proveedor?.nombre ?? '—'
      })),
      deudas: {
        total: totalDeudas.toFixed(2),
        count: countDeudas,
        lista: deudasLista.map(o => ({
          id:             o.id,
          numero:         o.numero,
          saldoPendiente: Number(o.saldoPendiente),
          cliente:        o.cliente?.nombre ?? '—',
          vehiculo:       `${o.vehiculo?.marca ?? ''} ${o.vehiculo?.modelo ?? ''}`.trim(),
          placa:          o.vehiculo?.placa ?? '',
        })),
      },
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}
