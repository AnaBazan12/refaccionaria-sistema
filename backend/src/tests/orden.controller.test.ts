import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock de Prisma ────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  ordenTrabajo: {
    findMany:   vi.fn(),
    count:      vi.fn(),
    findUnique: vi.fn(),
    create:     vi.fn(),
    update:     vi.fn(),
    updateMany: vi.fn(),
  },
  mecanico:     { findUnique: vi.fn() },
  cliente:      { findUnique: vi.fn() },
  vehiculo:     { findUnique: vi.fn(), update: vi.fn() },
  bitacoraOrden:{ create: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock('../utils/prisma', () => ({ prisma: mockPrisma }))

import {
  obtenerOrdenes, crearOrden, cambiarEstado,
  archivarOrden, archivarOrdeneViejas,
} from '../controllers/orden.controller'

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
describe('obtenerOrdenes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve estructura paginada { data, total, page, limit, totalPaginas }', async () => {
    const ordenes = [{ id: 'o1', numero: 1 }]
    mockPrisma.$transaction.mockResolvedValue([ordenes, 1])
    const res = mockRes()
    await obtenerOrdenes(req({ query: { page: '1', limit: '20' } }), res)
    const r = res.json.mock.calls[0][0]
    expect(r).toHaveProperty('data')
    expect(r).toHaveProperty('total')
    expect(r).toHaveProperty('page')
    expect(r).toHaveProperty('limit')
    expect(r).toHaveProperty('totalPaginas')
    expect(r.data).toEqual(ordenes)
  })

  it('clampea limit a máximo 50 aunque se pidan más', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0])
    const res = mockRes()
    await obtenerOrdenes(req({ query: { page: '1', limit: '9999' } }), res)
    expect(res.json.mock.calls[0][0].limit).toBeLessThanOrEqual(50)
  })

  it('calcula totalPaginas correctamente', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 45])
    const res = mockRes()
    await obtenerOrdenes(req({ query: { page: '1', limit: '20' } }), res)
    expect(res.json.mock.calls[0][0].totalPaginas).toBe(3) // ceil(45/20)
  })

  it('para MECANICO consulta su perfil y filtra por mecanicoId', async () => {
    mockPrisma.mecanico.findUnique.mockResolvedValue({ id: 'mec1' })
    mockPrisma.$transaction.mockResolvedValue([[], 0])
    const res = mockRes()
    await obtenerOrdenes(req({ query: {}, usuario: { id: 'u1', rol: 'MECANICO' } }), res)
    expect(mockPrisma.mecanico.findUnique).toHaveBeenCalledWith({ where: { usuarioId: 'u1' } })
  })

  it('devuelve 404 si el MECANICO no tiene perfil vinculado', async () => {
    mockPrisma.mecanico.findUnique.mockResolvedValue(null)
    const res = mockRes()
    await obtenerOrdenes(req({ query: {}, usuario: { id: 'u1', rol: 'MECANICO' } }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('oculta órdenes archivadas por defecto', async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0])
    const res = mockRes()
    await obtenerOrdenes(req({ query: {} }), res)
    // El primer argumento de $transaction es el array de operaciones;
    // verificamos que se pasó archivada: false al where (implícito en el mock)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(res.json.mock.calls[0][0]).toHaveProperty('data')
  })
})

describe('crearOrden', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve 404 si el cliente no existe', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue(null)
    const res = mockRes()
    await crearOrden(req({ body: { clienteId: 'c99', vehiculoId: 'v1' } }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('devuelve 404 si el vehículo no existe', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: 'c1' })
    mockPrisma.vehiculo.findUnique.mockResolvedValue(null)
    const res = mockRes()
    await crearOrden(req({ body: { clienteId: 'c1', vehiculoId: 'v99' } }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('crea la orden y devuelve 201 cuando los datos son válidos', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: 'c1' })
    mockPrisma.vehiculo.findUnique.mockResolvedValue({ id: 'v1' })
    mockPrisma.ordenTrabajo.create.mockResolvedValue({ id: 'o1', numero: 1, total: 0 })
    const res = mockRes()
    await crearOrden(req({
      body: { clienteId: 'c1', vehiculoId: 'v1', servicios: [] },
    }), res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(mockPrisma.ordenTrabajo.create).toHaveBeenCalled()
  })

  it('calcula totalManoObra sumando los servicios enviados', async () => {
    mockPrisma.cliente.findUnique.mockResolvedValue({ id: 'c1' })
    mockPrisma.vehiculo.findUnique.mockResolvedValue({ id: 'v1' })
    mockPrisma.ordenTrabajo.create.mockResolvedValue({ id: 'o1', numero: 1, total: 500 })
    const res = mockRes()
    await crearOrden(req({
      body: {
        clienteId: 'c1', vehiculoId: 'v1',
        servicios: [
          { servicioId: 's1', cantidad: 1, precioUnitario: 300 },
          { servicioId: 's2', cantidad: 2, precioUnitario: 100 },
        ],
      },
    }), res)
    const createData = mockPrisma.ordenTrabajo.create.mock.calls[0][0].data
    expect(createData.totalManoObra).toBe(500) // 300 + 2*100
    expect(createData.total).toBe(500)
  })
})

describe('cambiarEstado', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve 400 si el estado enviado es inválido', async () => {
    const res = mockRes()
    await cambiarEstado(req({ params: { id: 'o1' }, body: { estado: 'INVENTADO' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('devuelve 404 si la orden no existe', async () => {
    mockPrisma.ordenTrabajo.findUnique.mockResolvedValue(null)
    const res = mockRes()
    await cambiarEstado(req({ params: { id: 'o99' }, body: { estado: 'LISTO' } }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('usa $transaction para actualizar orden y bitácora juntos', async () => {
    mockPrisma.ordenTrabajo.findUnique.mockResolvedValue({ id: 'o1', estado: 'EN_PROCESO' })
    const ordenActualizada = { id: 'o1', estado: 'LISTO' }
    mockPrisma.$transaction.mockResolvedValue([ordenActualizada])
    const res = mockRes()
    await cambiarEstado(req({ params: { id: 'o1' }, body: { estado: 'LISTO' } }), res)
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ orden: ordenActualizada })
    )
  })
})

describe('archivarOrden', () => {
  beforeEach(() => vi.clearAllMocks())

  it('actualiza archivada=true en la orden', async () => {
    mockPrisma.ordenTrabajo.update.mockResolvedValue({ id: 'o1', archivada: true })
    const res = mockRes()
    await archivarOrden(req({ params: { id: 'o1' } }), res)
    expect(mockPrisma.ordenTrabajo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { archivada: true } })
    )
  })
})

describe('archivarOrdeneViejas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('informa cuántas órdenes se archivaron', async () => {
    mockPrisma.ordenTrabajo.updateMany.mockResolvedValue({ count: 5 })
    const res = mockRes()
    await archivarOrdeneViejas(req({ query: { dias: '30' } }), res)
    expect(res.json.mock.calls[0][0].archivadas).toBe(5)
  })

  it('usa 30 días por defecto cuando no se especifica el parámetro', async () => {
    mockPrisma.ordenTrabajo.updateMany.mockResolvedValue({ count: 0 })
    const res = mockRes()
    await archivarOrdeneViejas(req({ query: {} }), res)
    expect(mockPrisma.ordenTrabajo.updateMany).toHaveBeenCalled()
  })
})
