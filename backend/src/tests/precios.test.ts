import { describe, it, expect } from 'vitest'
import { calcularPreciosVenta, calcularSkip, clamp } from '../utils/precios'

describe('calcularPreciosVenta', () => {
  it('aplica margen del 30% e IVA correctamente', () => {
    // costo=100, margen=30% → sinIva=100/(1-0.3)=142.86 → conIva=142.86*1.16=165.71
    const { precioSinIva, precioConIva } = calcularPreciosVenta(100, 30)
    expect(precioSinIva).toBeCloseTo(142.86, 1)
    expect(precioConIva).toBeCloseTo(165.71, 1)
  })

  it('con margen 0% el precio solo agrega IVA', () => {
    const { precioConIva } = calcularPreciosVenta(100, 0)
    expect(precioConIva).toBeCloseTo(116, 1)
  })

  it('lanza error si costo es 0 o negativo', () => {
    expect(() => calcularPreciosVenta(0, 30)).toThrow(RangeError)
    expect(() => calcularPreciosVenta(-50, 30)).toThrow(RangeError)
  })

  it('lanza error si margen es 100 o más', () => {
    expect(() => calcularPreciosVenta(100, 100)).toThrow(RangeError)
    expect(() => calcularPreciosVenta(100, 150)).toThrow(RangeError)
  })

  it('lanza error si margen es negativo', () => {
    expect(() => calcularPreciosVenta(100, -5)).toThrow(RangeError)
  })

  it('devuelve valores redondeados a 2 decimales', () => {
    const { precioSinIva, precioConIva } = calcularPreciosVenta(57.3, 25)
    expect(String(precioSinIva).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
    expect(String(precioConIva).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
  })
})

describe('calcularSkip', () => {
  it('página 1 → skip 0', () => {
    expect(calcularSkip(1, 20)).toBe(0)
  })

  it('página 2 con límite 20 → skip 20', () => {
    expect(calcularSkip(2, 20)).toBe(20)
  })

  it('página 5 con límite 10 → skip 40', () => {
    expect(calcularSkip(5, 10)).toBe(40)
  })
})

describe('clamp', () => {
  it('devuelve min cuando el valor es menor', () => {
    expect(clamp(-5, 1, 100)).toBe(1)
  })

  it('devuelve max cuando el valor es mayor', () => {
    expect(clamp(200, 1, 100)).toBe(100)
  })

  it('devuelve el mismo valor cuando está en rango', () => {
    expect(clamp(50, 1, 100)).toBe(50)
  })
})
