import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'

export const obtenerProveedores = async (req: Request, res: Response) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })
    return res.json(proveedores)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const crearProveedor = async (req: Request, res: Response) => {
  try {
    const { nombre, contacto, telefono, ivaPorcentaje, descuentoPorcentaje } = req.body
    const proveedor = await prisma.proveedor.create({
      data: { nombre, contacto, telefono, ivaPocentaje: ivaPorcentaje, descuentoPorcentaje }
    })
    return res.status(201).json({ mensaje: 'Proveedor creado', proveedor })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ mensaje: 'Ya existe un proveedor con ese nombre' })
    }
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const actualizarProveedor = async (req: Request, res: Response) => {
  try {
    const { nombre, contacto, telefono, ivaPorcentaje, descuentoPorcentaje } = req.body
    const proveedor = await prisma.proveedor.update({
        // VERIFICACIÓN: Si el id no existe, es null o una cadena vacía
      where: { id: req.params.id as string},
      data: { nombre, contacto, telefono, ivaPocentaje: ivaPorcentaje, descuentoPorcentaje }
    })
    return res.json({ mensaje: 'Proveedor actualizado', proveedor })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

// ── Calcular factura de proveedor ─────────────────────────
export const calcularFactura = async (req: Request, res: Response) => {
  try {
    const { proveedorId, subtotal, numeroFactura, notas } = req.body

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: proveedorId }
    })
    if (!proveedor) return res.status(404).json({ mensaje: 'Proveedor no encontrado' })

    const ivaPct    = Number(proveedor.ivaPocentaje) / 100      // 0.13
    const descPct   = Number(proveedor.descuentoPorcentaje) / 100 // 0.13

    const ivaImporte       = subtotal * ivaPct                   // +13%
    const conIva           = subtotal + ivaImporte
    const descuentoImporte = conIva * descPct                    // -13%
    const totalPagar       = conIva - descuentoImporte

    // Guardar la factura
    const factura = await prisma.facturaProveedor.create({
      data: {
        numeroFactura,
        proveedorId,
        subtotal,
        ivaPorcentaje:       proveedor.ivaPocentaje,
        ivaImporte,
        descuentoPorcentaje: proveedor.descuentoPorcentaje,
        descuentoImporte,
        totalPagar,
        notas
      },
      include: { proveedor: { select: { nombre: true } } }
    })

    return res.status(201).json({
      mensaje: 'Factura calculada y guardada',
      desglose: {
        subtotal,
        mas_iva:    `+${proveedor.ivaPocentaje}% = $${ivaImporte.toFixed(2)}`,
        con_iva:    conIva.toFixed(2),
        menos_desc: `-${proveedor.descuentoPorcentaje}% = -$${descuentoImporte.toFixed(2)}`,
        total_pagar: totalPagar.toFixed(2)
      },
      factura
    })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const obtenerFacturas = async (req: Request, res: Response) => {
  try {
    const facturas = await prisma.facturaProveedor.findMany({
      where: req.query.proveedorId
        ? { proveedorId: req.query.proveedorId as string }
        : {},
      include: { proveedor: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' }
    })
    return res.json(facturas)
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}

export const marcarFacturaPagada = async (req: Request, res: Response) => {
  try {
    const factura = await prisma.facturaProveedor.update({
        // VERIFICACIÓN: Si el id no existe, es null o una cadena vacía
      where: { id: req.params.id as string },
      data: { pagada: true }
    })
    return res.json({ mensaje: 'Factura marcada como pagada', factura })
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error del servidor', error })
  }
}