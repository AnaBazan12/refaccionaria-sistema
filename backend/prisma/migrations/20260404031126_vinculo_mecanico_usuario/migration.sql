/*
  Warnings:

  - A unique constraint covering the columns `[usuarioId]` on the table `mecanicos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "mecanicos" ADD COLUMN     "usuarioId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "mecanicos_usuarioId_key" ON "mecanicos"("usuarioId");

-- AddForeignKey
ALTER TABLE "mecanicos" ADD CONSTRAINT "mecanicos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
