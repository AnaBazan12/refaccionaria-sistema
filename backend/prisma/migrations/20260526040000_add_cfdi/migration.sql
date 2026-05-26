-- Campos CFDI en config_negocio
ALTER TABLE "config_negocio"
  ADD COLUMN IF NOT EXISTS "cfdiRegimenFiscal" TEXT,
  ADD COLUMN IF NOT EXISTS "cfdiCodigoPostal"  TEXT,
  ADD COLUMN IF NOT EXISTS "cfdiSerie"         TEXT DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS "cfdiFacturamaUser" TEXT,
  ADD COLUMN IF NOT EXISTS "cfdiFacturamaPass" TEXT,
  ADD COLUMN IF NOT EXISTS "cfdiSandbox"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "cfdiCsdSubido"     BOOLEAN NOT NULL DEFAULT false;

-- Tabla de CFDIs
CREATE TABLE IF NOT EXISTS "cfdis" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "uuid"        TEXT NOT NULL UNIQUE,
  "serie"       TEXT,
  "folio"       INTEGER NOT NULL,
  "fecha"       TIMESTAMP(3) NOT NULL,
  "subtotal"    DECIMAL(10,2) NOT NULL,
  "iva"         DECIMAL(10,2) NOT NULL,
  "total"       DECIMAL(10,2) NOT NULL,
  "rfcEmisor"   TEXT NOT NULL,
  "rfcReceptor" TEXT NOT NULL,
  "receptor"    TEXT NOT NULL,
  "usoCfdi"     TEXT NOT NULL,
  "formaPago"   TEXT NOT NULL DEFAULT '01',
  "estado"      TEXT NOT NULL DEFAULT 'vigente',
  "facturamaId" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ordenId"     TEXT,
  CONSTRAINT "cfdis_ordenId_fkey" FOREIGN KEY ("ordenId")
    REFERENCES "ordenes_trabajo"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "cfdis_ordenId_idx"     ON "cfdis"("ordenId");
CREATE INDEX IF NOT EXISTS "cfdis_rfcReceptor_idx" ON "cfdis"("rfcReceptor");
CREATE INDEX IF NOT EXISTS "cfdis_createdAt_idx"   ON "cfdis"("createdAt");
