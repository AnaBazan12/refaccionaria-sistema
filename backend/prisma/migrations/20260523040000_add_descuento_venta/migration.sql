-- Agregar porcentaje de descuento a ventas (0-100, default 0 = sin descuento)
ALTER TABLE "ventas_refacciones"
  ADD COLUMN "descuentoPct" DECIMAL(5,2) NOT NULL DEFAULT 0;
