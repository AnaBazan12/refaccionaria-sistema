import { Request, Response } from 'express'
import {prisma} from '../utils/prisma'

// ── Reporte diario completo ───────────────────────────────────
export const reporteDiario = async (req: Request, res: Response) => {
  try {
    const fecha = req.query.fecha
      ? new Date(req.query.fecha as string)
      : new Date()

    const inicio = new Date(fecha)
    inicio.setHours(0, 0, 0, 0)
    const fin = new Date(fecha)
    fin.setHours(23, 59, 59, 999)

    // Ventas de refacciones del día
    const ventasRefacciones = await prisma.ventaRefaccion.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: {
        refaccion: { select: { nombre: true, codigo: true } },
        usuario:   { select: { nombre: true } }
      }
    })

    // Órdenes entregadas y pagadas del día
    const ordenesDelDia = await prisma.ordenTrabajo.findMany({
      where: {
        fechaEntrega: { gte: inicio, lte: fin },
        estado: 'ENTREGADO'
      },
      include: {
        cliente:  { select: { nombre: true } },
        vehiculo: { select: { placa: true, marca: true, modelo: true } },
        mecanico: { select: { nombre: true } },
        servicios: {
          include: { servicio: { select: { nombre: true } } }
        }
      }
    })

    // Calcular totales de refacciones
    const totalVentasMostrador = ventasRefacciones
      .filter(v => v.tipoVenta === 'MOSTRADOR')
      .reduce((s, v) => s + Number(v.subtotal), 0)

    const totalVentasTaller = ventasRefacciones
      .filter(v => v.tipoVenta === 'TALLER')
      .reduce((s, v) => s + Number(v.subtotal), 0)

    const totalVentasMayoreo = ventasRefacciones
      .filter(v => v.tipoVenta === 'MAYOREO')
      .reduce((s, v) => s + Number(v.subtotal), 0)

    const totalGananciaRefacciones = ventasRefacciones
      .reduce((s, v) => s + Number(v.ganancia), 0)

    // Calcular totales del taller
    const totalManoObra = ordenesDelDia
      .reduce((s, o) => s + Number(o.totalManoObra), 0)

    const totalRefaccionesEnOrdenes = ordenesDelDia
      .reduce((s, o) => s + Number(o.totalRefacciones), 0)

    const totalTaller = ordenesDelDia
      .reduce((s, o) => s + Number(o.total), 0)

    // Gran total del día
    const granTotal =
      totalVentasMostrador +
      totalVentasMayoreo +
      totalTaller

    return res.json({
      fecha: inicio.toISOString().split('T')[0],
      resumen: {
        granTotal:              granTotal.toFixed(2),
        totalGananciaRefacciones: totalGananciaRefacciones.toFixed(2),
        totalManoObra:          totalManoObra.toFixed(2)
      },
      refacciones: {
        totalMostrador: totalVentasMostrador.toFixed(2),
        totalTaller:    totalVentasTaller.toFixed(2),
        totalMayoreo:   totalVentasMayoreo.toFixed(2),
        ganancia:       totalGananciaRefacciones.toFixed(2),
        detalle:        ventasRefacciones
      },
      taller: {
        ordenesEntregadas:     ordenesDelDia.length,
        totalManoObra:         totalManoObra.toFixed(2),
        totalRefacciones:      totalRefaccionesEnOrdenes.toFixed(2),
        total:                 totalTaller.toFixed(2),
        detalle:               ordenesDelDia
      }
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Reporte mensual completo ──────────────────────────────────
export const reporteMensual = async (req: Request, res: Response) => {
  try {
    const anio = parseInt(req.query.anio as string) || new Date().getFullYear()
    const mes  = parseInt(req.query.mes  as string) || new Date().getMonth() + 1

    const inicio = new Date(anio, mes - 1, 1)
    const fin    = new Date(anio, mes, 0, 23, 59, 59)

    // ── Órdenes del mes ──────────────────────────────────────
    const ordenes = await prisma.ordenTrabajo.findMany({
      where: {
        createdAt: { gte: inicio, lte: fin },
        activo: true
      },
      include: {
        cliente:  { select: { nombre: true } },
        vehiculo: { select: { placa: true, marca: true, modelo: true } },
        mecanico: { select: { nombre: true } },
        servicios: {
          include: { servicio: { select: { nombre: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Órdenes por estado
    const ordenesPorEstado = ordenes.reduce((acc: any, o) => {
      acc[o.estado] = (acc[o.estado] || 0) + 1
      return acc
    }, {})

    // Órdenes entregadas y pagadas
    const ordenesEntregadas = ordenes.filter(o => o.estado === 'ENTREGADO')
    const ordenesPagadas    = ordenes.filter(o => o.pagado)

    const ingresosManoObra = ordenesEntregadas
      .reduce((s, o) => s + Number(o.totalManoObra), 0)

    const ingresosRefaccionesTaller = ordenesEntregadas
      .reduce((s, o) => s + Number(o.totalRefacciones), 0)

    const totalTaller = ordenesEntregadas
      .reduce((s, o) => s + Number(o.total), 0)

    // ── Ventas de refacciones del mes ────────────────────────
    const ventas = await prisma.ventaRefaccion.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: {
        refaccion: { select: { nombre: true, codigo: true } }
      }
    })

    const totalVentasRefacciones = ventas
      .reduce((s, v) => s + Number(v.subtotal), 0)

    const totalGananciaRefacciones = ventas
      .reduce((s, v) => s + Number(v.ganancia), 0)

    // Ventas por tipo
    const ventasPorTipo = ventas.reduce((acc: any, v) => {
      if (!acc[v.tipoVenta]) acc[v.tipoVenta] = { cantidad: 0, total: 0, ganancia: 0 }
      acc[v.tipoVenta].cantidad += v.cantidad
      acc[v.tipoVenta].total    += Number(v.subtotal)
      acc[v.tipoVenta].ganancia += Number(v.ganancia)
      return acc
    }, {})

    // Top 10 refacciones más vendidas
    const porRefaccion: Record<string, any> = {}
    for (const v of ventas) {
      if (!porRefaccion[v.refaccionId]) {
        porRefaccion[v.refaccionId] = {
          nombre:   v.refaccion.nombre,
          codigo:   v.refaccion.codigo,
          cantidad: 0,
          total:    0,
          ganancia: 0
        }
      }
      porRefaccion[v.refaccionId].cantidad += v.cantidad
      porRefaccion[v.refaccionId].total    += Number(v.subtotal)
      porRefaccion[v.refaccionId].ganancia += Number(v.ganancia)
    }

    const top10 = Object.values(porRefaccion)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10)

    // ── Mecánicos — productividad del mes ───────────────────
    const porMecanico: Record<string, any> = {}
    for (const o of ordenesEntregadas) {
      if (!o.mecanicoId) continue
      const key = o.mecanicoId
      if (!porMecanico[key]) {
        porMecanico[key] = {
          nombre:         o.mecanico?.nombre ?? 'Sin asignar',
          ordenes:        0,
          totalManoObra:  0
        }
      }
      porMecanico[key].ordenes       += 1
      porMecanico[key].totalManoObra += Number(o.totalManoObra)
    }

    // ── Autos atendidos ──────────────────────────────────────
    const autosAtendidos = [
      ...new Set(ordenesEntregadas.map(o => o.vehiculoId))
    ].length

    // ── Facturas de proveedores del mes ──────────────────────
    const facturas = await prisma.facturaProveedor.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { proveedor: { select: { nombre: true } } }
    })

    const totalCompras = facturas
      .reduce((s, f) => s + Number(f.totalPagar), 0)

    // ── Gran total y utilidad ────────────────────────────────
    const granTotalIngresos = totalTaller + totalVentasRefacciones
    const utilidadNeta      = granTotalIngresos - totalCompras

    return res.json({
      periodo: `${mes}/${anio}`,

      resumenGeneral: {
        granTotalIngresos:    granTotalIngresos.toFixed(2),
        totalTaller:          totalTaller.toFixed(2),
        totalRefacciones:     totalVentasRefacciones.toFixed(2),
        gananciaRefacciones:  totalGananciaRefacciones.toFixed(2),
        totalCompras:         totalCompras.toFixed(2),
        utilidadNeta:         utilidadNeta.toFixed(2),
        margenPromedio:       granTotalIngresos > 0
          ? ((totalGananciaRefacciones / granTotalIngresos) * 100).toFixed(1) + '%'
          : '0%'
      },

      taller: {
        totalOrdenes:       ordenes.length,
        ordenesEntregadas:  ordenesEntregadas.length,
        ordenesPagadas:     ordenesPagadas.length,
        autosAtendidos,
        ordenesPorEstado,
        ingresosManoObra:   ingresosManoObra.toFixed(2),
        ingresosRefacciones: ingresosRefaccionesTaller.toFixed(2),
        productividadMecanicos: Object.values(porMecanico)
      },

      refacciones: {
        totalVentas:   totalVentasRefacciones.toFixed(2),
        totalGanancia: totalGananciaRefacciones.toFixed(2),
        ventasPorTipo,
        top10
      },

      proveedores: {
        totalFacturas: facturas.length,
        totalCompras:  totalCompras.toFixed(2),
        detalle:       facturas
      },

      ordenes
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Stock bajo — alerta de inventario ────────────────────────
export const alertaStockBajo = async (_req: Request, res: Response) => {
  try {
    const refacciones = await prisma.refaccion.findMany({
      where: { activo: true },
      include: { proveedor: { select: { nombre: true } } }
    })

    const stockBajo = refacciones.filter(
      r => r.stockActual <= r.stockMinimo
    )

    return res.json({
      total:      stockBajo.length,
      refacciones: stockBajo.map(r => ({
        id:           r.id,
        codigo:       r.codigo,
        nombre:       r.nombre,
        stockActual:  r.stockActual,
        stockMinimo:  r.stockMinimo,
        proveedor:    r.proveedor?.nombre ?? 'Sin proveedor'
      }))
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Historial completo de un auto ─────────────────────────────
export const historialVehiculo = async (req: Request, res: Response) => {
  try {
    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: req.params.vehiculoId as string },
      include: {
        cliente: { select: { nombre: true, telefono: true } },
        ordenes: {
          where:   { activo: true },
          include: {
            mecanico:  { select: { nombre: true } },
            servicios: {
              include: { servicio: { select: { nombre: true } } }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!vehiculo) {
      return res.status(404).json({ mensaje: 'Vehículo no encontrado' })
    }

    const totalGastado = vehiculo.ordenes
      .filter(o => o.estado === 'ENTREGADO')
      .reduce((s, o) => s + Number(o.total), 0)

    return res.json({
      vehiculo: {
        placa:      vehiculo.placa,
        marca:      vehiculo.marca,
        modelo:     vehiculo.modelo,
        anio:       vehiculo.anio,
        cliente:    vehiculo.cliente.nombre,
        telefono:   vehiculo.cliente.telefono
      },
      estadisticas: {
        totalVisitas:  vehiculo.ordenes.length,
        totalGastado:  totalGastado.toFixed(2)
      },
      historial: vehiculo.ordenes
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}