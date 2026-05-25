-- AlterTable: agregar campos de crédito a compras
ALTER TABLE "compras"
  ADD COLUMN IF NOT EXISTS "esCredito"        BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fechaVencimiento" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pagada"           BOOLEAN   NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "telefonoContacto" TEXT;
