-- Agrega ticketId a ventas_refacciones para agrupar items del mismo ticket
ALTER TABLE "ventas_refacciones" ADD COLUMN "ticketId" TEXT;
