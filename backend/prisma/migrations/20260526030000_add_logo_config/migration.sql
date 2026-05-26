-- Agrega columna logo a config_negocio
ALTER TABLE "config_negocio" ADD COLUMN IF NOT EXISTS "logo" TEXT;
