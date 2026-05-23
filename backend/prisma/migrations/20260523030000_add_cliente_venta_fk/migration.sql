-- Eliminar tabla pivote many-to-many que no se usaba
DROP TABLE IF EXISTS "_ClienteToVentaRefaccion";

-- Agregar FK directa: una venta de mostrador puede pertenecer a un cliente
ALTER TABLE "ventas_refacciones"
  ADD COLUMN "clienteId" TEXT;

ALTER TABLE "ventas_refacciones"
  ADD CONSTRAINT "ventas_refacciones_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "clientes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
