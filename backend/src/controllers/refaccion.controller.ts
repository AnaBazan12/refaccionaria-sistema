import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { calcularPreciosVenta } from '../utils/precios'

export const obtenerRefacciones = async (req: Request, res: Response) => {
  try {
    const { stockBajo } = req.query
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const skip  = (page - 1) * limit

    const where: any = { activo: true }
    if (stockBajo === 'true') {
      where.stockActual = { lte: prisma.refaccion.fields.stockMinimo }
    }

    const [refacciones, total] = await prisma.$transaction([
      prisma.refaccion.findMany({
        where,
        include: { proveedor: { select: { nombre: true } } },
        orderBy: { nombre: 'asc' },
        take: limit,
        skip,
      }),
      prisma.refaccion.count({ where }),
    ])

    const resultado = refacciones.map(r => ({
      ...r,
      stockBajo: r.stockActual <= r.stockMinimo,
    }))

    return res.json({
      data: resultado,
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const obtenerRefaccionPorId = async (req: Request, res: Response) => {
  try {
    const refaccion = await prisma.refaccion.findUnique({
      where: { id: req.params.id as string},
      include: { proveedor: true }
    })
    if (!refaccion) return res.status(404).json({ mensaje: 'Refacción no encontrada' })
    return res.json(refaccion)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const buscarRefaccion = async (req: Request, res: Response) => {
  try {
    const { q } = req.query
    const refacciones = await prisma.refaccion.findMany({
      where: {
        activo: true,
        OR: [
          { nombre:  { contains: q as string, mode: 'insensitive' } },
          { codigo:  { contains: q as string, mode: 'insensitive' } },
          { marca:   { contains: q as string, mode: 'insensitive' } }
        ]
      },
      include: { proveedor: { select: { nombre: true } } },
      take: 20
    })
    return res.json(refacciones)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const crearRefaccion = async (req: Request, res: Response) => {
  try {
    const {
      codigo, nombre, descripcion, marca, unidad,
      stockActual, stockMinimo, costoCompra,
      margenGanancia, precioMayoreo, proveedorId
    } = req.body

    const margen = margenGanancia ?? 30
    const { precioConIva } = calcularPreciosVenta(costoCompra, margen)

    const refaccion = await prisma.refaccion.create({
      data: {
        codigo, nombre, descripcion, marca,
        unidad:          unidad ?? 'pieza',
        stockActual:     stockActual ?? 0,
        stockMinimo:     stockMinimo ?? 1,
        costoCompra,
        margenGanancia:  margen,
        precioMostrador: precioConIva,
        precioTaller:    precioConIva,   // por default igual, se puede editar
        precioMayoreo:   precioMayoreo ?? null,
        proveedorId:     proveedorId ?? null
      },
      include: { proveedor: { select: { nombre: true } } }
    })

    return res.status(201).json({ mensaje: 'Refacción creada', refaccion })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ mensaje: 'El código ya existe' })
    }
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const actualizarRefaccion = async (req: Request, res: Response) => {
  try {
    const {
      nombre, descripcion, marca, stockMinimo,
      costoCompra, margenGanancia,
      precioMostrador, precioTaller, precioMayoreo
    } = req.body

    // Si cambia costo o margen, recalcular precios automáticamente
    let precios: any = {}
    if (costoCompra && margenGanancia) {
      const { precioConIva } = calcularPreciosVenta(costoCompra, margenGanancia)
      precios = {
        precioMostrador: precioConIva,
        precioTaller:    precioConIva
      }
    }

    // Pero si el usuario manda precios manuales, esos ganan
    if (precioMostrador) precios.precioMostrador = precioMostrador
    if (precioTaller)    precios.precioTaller    = precioTaller
    if (precioMayoreo)   precios.precioMayoreo   = precioMayoreo

    const refaccion = await prisma.refaccion.update({
      where: { id: req.params.id as string },
      data: {
        nombre, descripcion, marca, stockMinimo,
        costoCompra, margenGanancia,
        ...precios
      }
    })

    return res.json({ mensaje: 'Refacción actualizada', refaccion })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Entrada de inventario (cuando llega mercancía) ───────────
export const entradaInventario = async (req: Request, res: Response) => {
  try {
    const { cantidad, motivo } = req.body

    const refaccion = await prisma.refaccion.update({
      where: { id: req.params.id as string  },
      data: { stockActual: { increment: cantidad } }
    })

    await prisma.movimientoInventario.create({
      data: {
        refaccionId: req.params.id as string,
        tipo: 'ENTRADA',
        cantidad,
        motivo: motivo ?? 'Compra a proveedor'
      }
    })

    return res.json({ mensaje: 'Entrada registrada', stockActual: refaccion.stockActual })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const eliminarRefaccion = async (req: Request, res: Response) => {
  try {
    await prisma.refaccion.update({
      where: { id: req.params.id as string },
      data: { activo: false }
    })
    return res.json({ mensaje: 'Refacción eliminada' })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Métricas financieras globales del inventario ─────────────
export const metricasInventario = async (_req: Request, res: Response) => {
  try {
    const refacciones = await prisma.refaccion.findMany({
      where: { activo: true },
      select: {
        id:              true,
        codigo:          true,
        nombre:          true,
        costoCompra:     true,
        precioMostrador: true,
        margenGanancia:  true,
        stockActual:     true,
        stockMinimo:     true,
      }
    })

    let valorInvertido   = 0
    let utilidadPotencial = 0
    let totalPiezas      = 0
    let stockBajoCount   = 0
    let sumMargen        = 0

    for (const r of refacciones) {
      const costo   = Number(r.costoCompra)
      const precio  = Number(r.precioMostrador)
      const stock   = r.stockActual

      valorInvertido    += costo * stock
      utilidadPotencial += (precio - costo) * stock
      totalPiezas       += stock
      sumMargen         += Number(r.margenGanancia)
      if (stock <= r.stockMinimo) stockBajoCount++
    }

    const margenPromedio = refacciones.length > 0
      ? sumMargen / refacciones.length
      : 0

    // Top 5 productos por valor en inventario
    const top5 = [...refacciones]
      .sort((a, b) =>
        (Number(b.costoCompra) * b.stockActual) -
        (Number(a.costoCompra) * a.stockActual)
      )
      .slice(0, 5)
      .map(r => ({
        id:       r.id,
        codigo:   r.codigo,
        nombre:   r.nombre,
        valor:    Number(r.costoCompra)     * r.stockActual,
        utilidad: (Number(r.precioMostrador) - Number(r.costoCompra)) * r.stockActual,
        margen:   Number(r.margenGanancia),
        stock:    r.stockActual,
      }))

    return res.json({
      totalProductos:   refacciones.length,
      totalPiezas,
      valorInvertido,
      utilidadPotencial,
      margenPromedio,
      stockBajoCount,
      top5ValorInventario: top5,
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}