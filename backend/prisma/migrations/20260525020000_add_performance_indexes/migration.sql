-- Índices de rendimiento para consultas frecuentes
-- Aplica: prisma migrate deploy (sin regenerar cliente)

-- ordenes_trabajo: filtros más comunes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ordenes_trabajo_estado_idx"      ON "ordenes_trabajo"("estado");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ordenes_trabajo_fechaIngreso_idx" ON "ordenes_trabajo"("fechaIngreso");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ordenes_trabajo_clienteId_idx"    ON "ordenes_trabajo"("clienteId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ordenes_trabajo_mecanicoId_idx"   ON "ordenes_trabajo"("mecanicoId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ordenes_trabajo_archivada_idx"    ON "ordenes_trabajo"("archivada");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ordenes_trabajo_estadoPago_idx"   ON "ordenes_trabajo"("estadoPago");

-- ventas_refacciones: reportes y tickets
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ventas_refacciones_fecha_idx"       ON "ventas_refacciones"("fecha");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ventas_refacciones_refaccionId_idx"  ON "ventas_refacciones"("refaccionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ventas_refacciones_ticketId_idx"     ON "ventas_refacciones"("ticketId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ventas_refacciones_clienteId_idx"    ON "ventas_refacciones"("clienteId");

-- movimientos_inventario: historial de stock
CREATE INDEX CONCURRENTLY IF NOT EXISTS "movimientos_inventario_refaccionId_idx" ON "movimientos_inventario"("refaccionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "movimientos_inventario_fecha_idx"        ON "movimientos_inventario"("fecha");

-- compras: filtros y créditos
CREATE INDEX CONCURRENTLY IF NOT EXISTS "compras_fecha_idx"           ON "compras"("fecha");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "compras_proveedorId_idx"      ON "compras"("proveedorId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "compras_credito_pagada_idx"   ON "compras"("esCredito", "pagada");

-- refacciones: búsqueda y stock bajo
CREATE INDEX CONCURRENTLY IF NOT EXISTS "refacciones_nombre_idx"      ON "refacciones"("nombre");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "refacciones_activo_idx"       ON "refacciones"("activo");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "refacciones_proveedorId_idx"  ON "refacciones"("proveedorId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "refacciones_stockActual_idx"  ON "refacciones"("stockActual");

-- gastos_caja: reportes por fecha y categoría
CREATE INDEX CONCURRENTLY IF NOT EXISTS "gastos_caja_fecha_idx"     ON "gastos_caja"("fecha");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "gastos_caja_categoria_idx"  ON "gastos_caja"("categoria");

-- bitacora_ordenes: historial de órdenes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "bitacora_ordenes_ordenId_idx" ON "bitacora_ordenes"("ordenId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "bitacora_ordenes_fecha_idx"   ON "bitacora_ordenes"("fecha");
