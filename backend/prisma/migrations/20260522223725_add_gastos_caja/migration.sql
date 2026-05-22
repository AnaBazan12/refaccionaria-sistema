-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('REFACCIONES', 'NOMINA', 'SERVICIOS', 'OTROS');

-- CreateTable
CREATE TABLE "gastos_caja" (
    "id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL DEFAULT 'OTROS',
    "metodoPago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "notas" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,

    CONSTRAINT "gastos_caja_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gastos_caja" ADD CONSTRAINT "gastos_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
