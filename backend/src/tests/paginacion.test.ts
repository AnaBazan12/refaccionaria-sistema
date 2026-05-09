import { describe, it, expect } from 'vitest'
import { calcularSkip, clamp } from '../utils/precios'

/**
 * Verifica la lógica de paginación que usan los controllers.
 * Los controllers calculan page/limit/skip inline; aquí comprobamos
 * las funciones de utilería que los respaldan.
 */

describe('Lógica de paginación', () => {
  const normalizarParametros = (rawPage: unknown, rawLimit: unknown, maxLimit = 50) => {
    const page  = clamp(Number(rawPage)  || 1, 1, 9999)
    const limit = clamp(Number(rawLimit) || 20, 1, maxLimit)
    const skip  = calcularSkip(page, limit)
    return { page, limit, skip }
  }

  it('usa valores por defecto cuando no se envían parámetros', () => {
    const { page, limit, skip } = normalizarParametros(undefined, undefined)
    expect(page).toBe(1)
    expect(limit).toBe(20)
    expect(skip).toBe(0)
  })

  it('clampea limit máximo a 50', () => {
    const { limit } = normalizarParametros(1, 999, 50)
    expect(limit).toBe(50)
  })

  it('no permite page menor a 1', () => {
    const { page } = normalizarParametros(0, 20)
    expect(page).toBe(1)
  })

  it('calcula skip correctamente para páginas intermedias', () => {
    const { skip } = normalizarParametros(3, 15)
    expect(skip).toBe(30) // (3-1) * 15 = 30
  })

  it('calcula totalPaginas correctamente', () => {
    const calcularTotalPaginas = (total: number, limit: number) =>
      Math.ceil(total / limit)

    expect(calcularTotalPaginas(0, 20)).toBe(0)
    expect(calcularTotalPaginas(1, 20)).toBe(1)
    expect(calcularTotalPaginas(20, 20)).toBe(1)
    expect(calcularTotalPaginas(21, 20)).toBe(2)
    expect(calcularTotalPaginas(100, 25)).toBe(4)
    expect(calcularTotalPaginas(101, 25)).toBe(5)
  })
})
