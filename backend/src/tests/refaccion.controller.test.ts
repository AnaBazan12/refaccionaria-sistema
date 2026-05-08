import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock de Prisma ────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  refaccion: {
    findMany:   vi.fn(),
    count:      vi.fn(),
    findUnique: vi.fn(),
    create:     vi.fn(),
    update:     vi.fn(),
    fields:     { stockMinimo: 'stockMinimo' }, // campo referenciado en filtro Prisma
  },
  movimientoInventario: { create: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock('../utils/prisma', () => ({ prisma: mockPrisma }))

import {
  obtenerRefacciones, crearRefaccion, actualizarRefaccion,
  entradaInventario, eliminarRefaccion,
} from '../controllers/refaccion.controller'

// ── Helpers ───────────────────────────────────────────────────
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

const req = (overrides: any = {}): any => ({
  body: {}, params: {}, query: {}, usuario: { id: 'u1', rol: 'ADMIN' }, ...overrides,
})

// ── Tests ─────────────────────────────────────────────────────
describe('obtenerRefacciones', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve estructura paginada { data, total, page, limit, totalPaginas }', async () => {
    const refacciones = [
      { id: 'r1', nombre: 'Filtro', stockActual: 5, stockMinimo: 2 },
    ]
    mockPrisma.$transaction.mockResolvedValue([refacciones, 1])
    const res = mockRes()
    await obtenerRefacciones(req({ query: { page: '1', limit: '20' } }), res)
    const r = res.json.mock.calls[0][0]
    expect(r).toHaveProperty('data')
    expect(r).toHaveProperty('total')
    expect(r).toHaveProperty('page')
    expect(r).toHaveProperty('limit')
    expect(r).toHaveProperty('totalPaginas')
  })

  it('agrega stockBajo=true cuando stockActual <= stockMinimo', async () => {
    const refacciones = [
      { id: 'r1', nombre: 'Bujía', stockActual: 1, stockMinimo: 5 },
    ]
    mockPrisma.$transaction.mockResolvedValue([refacciones, 1])
    const res = mockRes()
    await obtenerRefacciones(req({ query: {} }), res)
    expect(res.json.mock.calls[0][0].data[0].stockBajo).toBe(true)
  })

  it('agrega stockBajo=false cuando stockActual > stockMinimo', async () => {
    const refacciones = [
      { id: 'r2', nombre: 'Aceite', stockActual: 10, stockMinimo: 3 },
    ]
    mockPrisma.$transaction.mockResolvedValue([refacciones, 1])
    const res = mockRes()
    await obtenerRefacciones(req({ query: {} }), res)
    expect(res.json.mock.calls[0][0].data[0].stockBajo).toBe(false)
  })

  it('clampea limit a máximo 100', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0])
    const res = mockRes()
    await obtenerRefacciones(req({ query: { limit: '9999' } }), res)
    expect(res.json.mock.calls[0][0].limit).toBeLessThanOrEqual(100)
  })

  it('calcula totalPaginas correctamente', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 55])
    const res = mockRes()
    await obtenerRefacciones(req({ query: { page: '1', limit: '20' } }), res)
    expect(res.json.mock.calls[0][0].totalPaginas).toBe(3) // ceil(55/20)
  })
})

describe('crearRefaccion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve 201 y el mensaje correcto al crear', async () => {
    const refaccion = { id: 'r1', nombre: 'Filtro de aceite', precioMostrador: 232 }
    mockPrisma.refaccion.create.mockResolvedValue(refaccion)
    const res = mockRes()
    await crearRefaccion(req({
      body: { codigo: 'FA-001', nombre: 'Filtro de aceite', costoCompra: 100, margenGanancia: 30 },
    }), res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0]).toHaveProperty('refaccion')
  })

  it('calcula precioMostrador usando calcularPreciosVenta (costo/margen/IVA)', async () => {
    mockPrisma.refaccion.create.mockResolvedValue({ id: 'r1' })
    const res = mockRes()
    await crearRefaccion(req({
      body: { codigo: 'FA-001', nombre: 'Filtro', costoCompra: 100, margenGanancia: 30 },
    }), res)
    const data = mockPrisma.refaccion.create.mock.calls[0][0].data
    // 100 / (1 - 0.30) * 1.16 ≈ 165.71
    expect(data.precioMostrador).toBeCloseTo(165.71, 0)
    expect(data.precioTaller).toBeCloseTo(165.71, 0)
  })

  it('usa margen 30% por defecto si no se envía margenGanancia', async () => {
    mockPrisma.refaccion.create.mockResolvedValue({ id: 'r1' })
    const res = mockRes()
    await crearRefaccion(req({
      body: { codigo: 'FA-002', nombre: 'Bujía', costoCompra: 50 },
    }), res)
    const data = mockPrisma.refaccion.create.mock.calls[0][0].data
    expect(data.margenGanancia).toBe(30)
  })

  it('devuelve 400 si el código ya existe (P2002)', async () => {
    const err: any = new Error('Unique constraint')
    err.code = 'P2002'
    mockPrisma.refaccion.create.mockRejectedValue(err)
    const res = mockRes()
    await crearRefaccion(req({
      body: { codigo: 'FA-001', nombre: 'Filtro', costoCompra: 100 },
    }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('actualizarRefaccion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('actualiza la refacción y devuelve el resultado', async () => {
    const actualizada = { id: 'r1', nombre: 'Filtro actualizado' }
    mockPrisma.refaccion.update.mockResolvedValue(actualizada)
    const res = mockRes()
    await actualizarRefaccion(req({
      params: { id: 'r1' },
      body: { nombre: 'Filtro actualizado' },
    }), res)
    expect(mockPrisma.refaccion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1' } })
    )
    expect(res.json.mock.calls[0][0]).toHaveProperty('refaccion', actualizada)
  })

  it('recalcula precioMostrador si se envían costoCompra y margenGanancia', async () => {
    mockPrisma.refaccion.update.mockResolvedValue({ id: 'r1' })
    const res = mockRes()
    await actualizarRefaccion(req({
      params: { id: 'r1' },
      body: { costoCompra: 200, margenGanancia: 25 },
    }), res)
    const data = mockPrisma.refaccion.update.mock.calls[0][0].data
    // 200 / (1 - 0.25) * 1.16 ≈ 309.33
    expect(data.precioMostrador).toBeCloseTo(309.33, 0)
  })

  it('los precios manuales tienen prioridad sobre el cálculo automático', async () => {
    mockPrisma.refaccion.update.mockResolvedValue({ id: 'r1' })
    const res = mockRes()
    await actualizarRefaccion(req({
      params: { id: 'r1' },
      body: { costoCompra: 100, margenGanancia: 30, precioMostrador: 999 },
    }), res)
    const data = mockPrisma.refaccion.update.mock.calls[0][0].data
    expect(data.precioMostrador).toBe(999)
  })
})

describe('entradaInventario', () => {
  beforeEach(() => vi.clearAllMocks())

  it('incrementa el stock y crea un movimiento de tipo ENTRADA', async () => {
    mockPrisma.refaccion.update.mockResolvedValue({ id: 'r1', stockActual: 15 })
    mockPrisma.movimientoInventario.create.mockResolvedValue({})
    const res = mockRes()
    await entradaInventario(req({
      params: { id: 'r1' },
      body: { cantidad: 10, motivo: 'Compra urgente' },
    }), res)
    expect(mockPrisma.refaccion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stockActual: { increment: 10 } } })
    )
    expect(mockPrisma.movimientoInventario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'ENTRADA', cantidad: 10 }),
      })
    )
  })

  it('devuelve el stockActual actualizado en la respuesta', async () => {
    mockPrisma.refaccion.update.mockResolvedValue({ id: 'r1', stockActual: 20 })
    mockPrisma.movimientoInventario.create.mockResolvedValue({})
    const res = mockRes()
    await entradaInventario(req({
      params: { id: 'r1' },
      body: { cantidad: 5 },
    }), res)
    expect(res.json.mock.calls[0][0].stockActual).toBe(20)
  })

  it('usa motivo por defecto si no se envía', async () => {
    mockPrisma.refaccion.update.mockResolvedValue({ id: 'r1', stockActual: 5 })
    mockPrisma.movimientoInventario.create.mockResolvedValue({})
    const res = mockRes()
    await entradaInventario(req({ params: { id: 'r1' }, body: { cantidad: 3 } }), res)
    const motivo = mockPrisma.movimientoInventario.create.mock.calls[0][0].data.motivo
    expect(motivo).toBeTruthy()
  })
})

describe('eliminarRefaccion', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hace soft-delete seteando activo=false', async () => {
    mockPrisma.refaccion.update.mockResolvedValue({ id: 'r1', activo: false })
    const res = mockRes()
    await eliminarRefaccion(req({ params: { id: 'r1' } }), res)
    expect(mockPrisma.refaccion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1' }, data: { activo: false } })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: expect.any(String) })
    )
  })
})
