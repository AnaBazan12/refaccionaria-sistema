-- Garantía del servicio en órdenes de trabajo
ALTER TABLE "ordenes_trabajo" ADD COLUMN IF NOT EXISTS "garantiaMeses" INTEGER;
ALTER TABLE "ordenes_trabajo" ADD COLUMN IF NOT EXISTS "garantiaVence" TIMESTAMP(3);
