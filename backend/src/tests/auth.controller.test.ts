import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// ── Mock de dependencias antes de importar el controller ──────
const mockPrisma = vi.hoisted(() => ({
  usuario: {
    findUnique: vi.fn(),
    create:     vi.fn(),
    findMany:   vi.fn(),
    update:     vi.fn(),
  },
}))

vi.mock('../utils/prisma', () => ({ prisma: mockPrisma }))
vi.mock('../utils/jwt',    () => ({ generarToken: vi.fn().mockReturnValue('mock-jwt-token') }))

import { login, registrar, toggleActivo, cambiarPassword } from '../controllers/auth.controller'

// ── Helpers ───────────────────────────────────────────────────
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

const req = (overrides: any = {}): any => ({
  body: {}, params: {}, query: {}, usuario: undefined, ...overrides
})

// ── Tests ─────────────────────────────────────────────────────
describe('auth.controller — login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve 401 si el usuario no existe', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null)
    const res = mockRes()
    await login(req({ body: { email: 'x@x.com', password: '123' } }), res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: expect.any(String) })
    )
  })

  it('devuelve 401 si el usuario está inactivo', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ id: 'u1', activo: false, password: 'h' })
    const res = mockRes()
    await login(req({ body: { email: 'x@x.com', password: '123' } }), res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('devuelve 401 si la contraseña es incorrecta', async () => {
    const hash = await bcrypt.hash('correcta', 10)
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@a.com', nombre: 'Ana', rol: 'ADMIN',
      password: hash, activo: true,
    })
    const res = mockRes()
    await login(req({ body: { email: 'a@a.com', password: 'incorrecta' } }), res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('devuelve token y datos del usuario en login exitoso', async () => {
    const hash = await bcrypt.hash('pass123', 10)
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@a.com', nombre: 'Ana', rol: 'ADMIN',
      password: hash, activo: true,
    })
    const res = mockRes()
    await login(req({ body: { email: 'a@a.com', password: 'pass123' } }), res)
    const respuesta = res.json.mock.calls[0][0]
    expect(respuesta.token).toBe('mock-jwt-token')
    expect(respuesta.usuario).toMatchObject({ email: 'a@a.com', rol: 'ADMIN' })
    expect(respuesta.usuario).not.toHaveProperty('password')
  })
})

describe('auth.controller — registrar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve 400 si el email ya está registrado', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({ id: 'u1' })
    const res = mockRes()
    await registrar(req({ body: { nombre: 'Bob', email: 'b@b.com', password: 'x', rol: 'RECEPCIONISTA' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('crea el usuario y devuelve 201', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null)
    mockPrisma.usuario.create.mockResolvedValue({
      id: 'u2', nombre: 'Bob', email: 'b@b.com', rol: 'RECEPCIONISTA', createdAt: new Date(),
    })
    const res = mockRes()
    await registrar(req({ body: { nombre: 'Bob', email: 'b@b.com', password: 'pass123', rol: 'RECEPCIONISTA' } }), res)
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('la contraseña almacenada es un hash, no texto plano', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null)
    mockPrisma.usuario.create.mockResolvedValue({ id: 'u2', nombre: 'Bob' })
    const res = mockRes()
    await registrar(req({ body: { nombre: 'Bob', email: 'b@b.com', password: 'secreto', rol: 'ADMIN' } }), res)
    const passwordGuardada = mockPrisma.usuario.create.mock.calls[0][0].data.password
    expect(passwordGuardada).not.toBe('secreto')
    expect(await bcrypt.compare('secreto', passwordGuardada)).toBe(true)
  })
})

describe('auth.controller — toggleActivo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('actualiza el campo activo del usuario', async () => {
    mockPrisma.usuario.update.mockResolvedValue({ id: 'u1', nombre: 'Ana', activo: false })
    const res = mockRes()
    await toggleActivo(req({ params: { id: 'u1' }, body: { activo: false } }), res)
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, data: { activo: false } })
    )
    expect(res.json).toHaveBeenCalled()
  })
})

describe('auth.controller — cambiarPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devuelve 400 si la nueva contraseña es muy corta', async () => {
    const res = mockRes()
    await cambiarPassword(
      req({ body: { passwordActual: 'vieja', passwordNuevo: 'abc' }, usuario: { id: 'u1' } }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('devuelve 401 si la contraseña actual es incorrecta', async () => {
    const hash = await bcrypt.hash('correcta', 10)
    mockPrisma.usuario.findUnique.mockResolvedValue({ id: 'u1', password: hash })
    const res = mockRes()
    await cambiarPassword(
      req({ body: { passwordActual: 'incorrecta', passwordNuevo: 'nueva123' }, usuario: { id: 'u1' } }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('actualiza la contraseña cuando todo es correcto', async () => {
    const hash = await bcrypt.hash('vieja123', 10)
    mockPrisma.usuario.findUnique.mockResolvedValue({ id: 'u1', password: hash })
    mockPrisma.usuario.update.mockResolvedValue({ id: 'u1' })
    const res = mockRes()
    await cambiarPassword(
      req({ body: { passwordActual: 'vieja123', passwordNuevo: 'nueva456' }, usuario: { id: 'u1' } }),
      res
    )
    expect(mockPrisma.usuario.update).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mensaje: expect.any(String) })
    )
  })
})
