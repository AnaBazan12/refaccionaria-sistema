-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('MOSTRADOR', 'TALLER', 'MAYOREO');

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "ivaPocentaje" DECIMAL(5,2) NOT NULL DEFAULT 16,
    "descuentoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refacciones" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "marca" TEXT,
    "unidad" TEXT NOT NULL DEFAULT 'pieza',
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 1,
    "costoCompra" DECIMAL(10,2) NOT NULL,
    "margenGanancia" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "precioMostrador" DECIMAL(10,2) NOT NULL,
    "precioTaller" DECIMAL(10,2) NOT NULL,
    "precioMayoreo" DECIMAL(10,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proveedorId" TEXT,

    CONSTRAINT "refacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas_refacciones" (
    "id" TEXT NOT NULL,
    "tipoVenta" "TipoVenta" NOT NULL DEFAULT 'MOSTRADOR',
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "precioSinIva" DECIMAL(10,2) NOT NULL,
    "costoCompra" DECIMAL(10,2) NOT NULL,
    "ganancia" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refaccionId" TEXT NOT NULL,
    "ordenId" TEXT,
    "usuarioId" TEXT,

    CONSTRAINT "ventas_refacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refaccionId" TEXT NOT NULL,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas_proveedor" (
    "id" TEXT NOT NULL,
    "numeroFactura" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "ivaPorcentaje" DECIMAL(5,2) NOT NULL,
    "ivaImporte" DECIMAL(10,2) NOT NULL,
    "descuentoPorcentaje" DECIMAL(5,2) NOT NULL,
    "descuentoImporte" DECIMAL(10,2) NOT NULL,
    "totalPagar" DECIMAL(10,2) NOT NULL,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "proveedorId" TEXT NOT NULL,

    CONSTRAINT "facturas_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClienteToVentaRefaccion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClienteToVentaRefaccion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OrdenServicioToVentaRefaccion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrdenServicioToVentaRefaccion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_nombre_key" ON "proveedores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "refacciones_codigo_key" ON "refacciones"("codigo");

-- CreateIndex
CREATE INDEX "_ClienteToVentaRefaccion_B_index" ON "_ClienteToVentaRefaccion"("B");

-- CreateIndex
CREATE INDEX "_OrdenServicioToVentaRefaccion_B_index" ON "_OrdenServicioToVentaRefaccion"("B");

-- AddForeignKey
ALTER TABLE "refacciones" ADD CONSTRAINT "refacciones_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_refacciones" ADD CONSTRAINT "ventas_refacciones_refaccionId_fkey" FOREIGN KEY ("refaccionId") REFERENCES "refacciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_refacciones" ADD CONSTRAINT "ventas_refacciones_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_refacciones" ADD CONSTRAINT "ventas_refacciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_refaccionId_fkey" FOREIGN KEY ("refaccionId") REFERENCES "refacciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_proveedor" ADD CONSTRAINT "facturas_proveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClienteToVentaRefaccion" ADD CONSTRAINT "_ClienteToVentaRefaccion_A_fkey" FOREIGN KEY ("A") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClienteToVentaRefaccion" ADD CONSTRAINT "_ClienteToVentaRefaccion_B_fkey" FOREIGN KEY ("B") REFERENCES "ventas_refacciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrdenServicioToVentaRefaccion" ADD CONSTRAINT "_OrdenServicioToVentaRefaccion_A_fkey" FOREIGN KEY ("A") REFERENCES "orden_servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrdenServicioToVentaRefaccion" ADD CONSTRAINT "_OrdenServicioToVentaRefaccion_B_fkey" FOREIGN KEY ("B") REFERENCES "ventas_refacciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
