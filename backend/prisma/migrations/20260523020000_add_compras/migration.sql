-- Módulo de compras / entradas de inventario

CREATE TABLE "compras" (
  "id"             TEXT        NOT NULL,
  "fecha"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "facturaNumero"  TEXT,
  "notas"          TEXT,
  "total"          DECIMAL(10,2) NOT NULL,
  "proveedorId"    TEXT,
  CONSTRAINT "compras_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compras_proveedorId_fkey"
    FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "compra_items" (
  "id"             TEXT         NOT NULL,
  "cantidad"       INTEGER      NOT NULL,
  "costoUnitario"  DECIMAL(10,2) NOT NULL,
  "subtotal"       DECIMAL(10,2) NOT NULL,
  "actualizoCosto" BOOLEAN      NOT NULL DEFAULT false,
  "compraId"       TEXT         NOT NULL,
  "refaccionId"    TEXT         NOT NULL,
  CONSTRAINT "compra_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "compra_items_compraId_fkey"
    FOREIGN KEY ("compraId") REFERENCES "compras"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "compra_items_refaccionId_fkey"
    FOREIGN KEY ("refaccionId") REFERENCES "refacciones"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
