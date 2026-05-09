/**
 * Calcula precio de venta a partir del costo de compra y margen de ganancia.
 * El precio final ya incluye IVA del 16%.
 *
 * Fórmula: precioConIva = (costo / (1 - margen/100)) * 1.16
 */
export const calcularPreciosVenta = (costoCompra: number, margenGanancia: number) => {
  if (costoCompra <= 0) throw new RangeError('costoCompra debe ser mayor a 0')
  if (margenGanancia < 0 || margenGanancia >= 100) {
    throw new RangeError('margenGanancia debe estar entre 0 y 99')
  }

  const precioSinIva = costoCompra / (1 - margenGanancia / 100)
  const precioConIva = precioSinIva * 1.16

  return {
    precioSinIva: Number(precioSinIva.toFixed(2)),
    precioConIva: Number(precioConIva.toFixed(2)),
  }
}

/** Calcula cuántos registros saltar dado página y límite (base 1). */
export const calcularSkip = (page: number, limit: number) => (page - 1) * limit

/** Clampea un número entre min y max. */
export const clamp = (valor: number, min: number, max: number) =>
  Math.min(max, Math.max(min, valor))
