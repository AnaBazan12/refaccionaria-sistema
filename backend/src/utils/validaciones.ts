import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

// ── Schemas ───────────────────────────────────────────────────
export const schemaCliente = z.object({
  nombre:    z.string().min(2, 'Nombre muy corto').max(100),
  telefono:  z.string().max(20).optional(),
  email:     z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().max(200).optional()
})

export const schemaVehiculo = z.object({
  placa:       z.string().min(5).max(10),
  marca:       z.string().min(2).max(50),
  modelo:      z.string().min(1).max(50),
  anio:        z.number().min(1970).max(new Date().getFullYear() + 1),
  color:       z.string().max(30).optional(),
  numSerie:    z.string().max(20).optional(),
  kilometraje: z.number().min(0).optional(),
  clienteId:   z.string().uuid('ID de cliente inválido')
})

export const schemaOrden = z.object({
  clienteId:    z.string().uuid(),
  vehiculoId:   z.string().uuid(),
  mecanicoId:   z.string().uuid().optional(),
  kilometraje:  z.number().min(0).optional(),
  diagnostico:  z.string().max(500).optional(),
  observaciones:z.string().max(500).optional()
})

export const schemaRefaccion = z.object({
  codigo:          z.string().min(1).max(30),
  nombre:          z.string().min(2).max(100),
  costoCompra:     z.number().min(0),
  margenGanancia:  z.number().min(0).max(100),
  precioMostrador: z.number().min(0),
  precioTaller:    z.number().min(0),
  stockActual:     z.number().min(0).default(0),
  stockMinimo:     z.number().min(0).default(1)
})

export const schemaPago = z.object({
  monto: z.number().positive('El monto debe ser mayor a 0'),
  tipo:  z.enum(['CONTADO', 'ANTICIPO', 'CREDITO', 'ABONO']),
  notas: z.string().max(200).optional()
})

// ── Middleware validador ──────────────────────────────────────
export const validar = (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errores = result.error.issues.map(e => ({
        campo:   e.path.join('.'),
        mensaje: e.message
      }))
      return res.status(400).json({
        mensaje: 'Datos inválidos',
        errores
      })
    }
    req.body = result.data
    next()
  }