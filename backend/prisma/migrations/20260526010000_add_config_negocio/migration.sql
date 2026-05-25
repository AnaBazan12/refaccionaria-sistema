-- CreateTable: configuración del negocio (singleton row)
CREATE TABLE IF NOT EXISTS "config_negocio" (
    "id"        TEXT NOT NULL DEFAULT 'singleton',
    "nombre"    TEXT NOT NULL DEFAULT 'Mi Taller',
    "subtitulo" TEXT NOT NULL DEFAULT 'Servicio mecánico profesional',
    "telefono"  TEXT NOT NULL DEFAULT '',
    "direccion" TEXT NOT NULL DEFAULT '',
    "ciudad"    TEXT NOT NULL DEFAULT '',
    "rfc"       TEXT NOT NULL DEFAULT '',
    "email"     TEXT NOT NULL DEFAULT '',
    "horario"   TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "config_negocio_pkey" PRIMARY KEY ("id")
);

-- Seed: fila inicial con valores del env si existen
INSERT INTO "config_negocio" ("id", "nombre", "subtitulo", "telefono", "direccion", "ciudad", "updatedAt")
VALUES ('singleton', 'Mi Taller', 'Servicio mecánico profesional', '', '', '', NOW())
ON CONFLICT ("id") DO NOTHING;
