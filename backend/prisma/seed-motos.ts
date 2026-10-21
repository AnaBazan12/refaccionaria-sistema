import 'dotenv/config'
import * as fs   from 'fs'
import * as path from 'path'
import { PrismaClient } from '../src/generated/client'
import { PrismaPg }     from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

// ── Tipos del JSON de Supermoto ───────────────────────────────────
interface RefaccionItem {
  codigo:          string
  nombre:          string
  descripcion:     string
  marca:           string
  categoria:       string   // se embebe como "[MOTO - categoria]" en descripcion
  unidad:          string
  stockActual:     number   // piezas a agregar al inventario
  stockMinimo:     number
  costoCompra:     number
  margenGanancia:  number
  precioMostrador: number
  precioTaller:    number
  precioMayoreo?:  number
}

interface SeedData {
  proveedor: {
    nombre: string
    rfc:    string   // se guarda en campo `contacto` (no existe rfc en el modelo)
  }
  factura: {
    numero:                string
    fecha:                 string
    subtotalAntesDescuento: number
    descuento:             number
    subtotal:              number   // neto post-descuento, pre-IVA
    iva:                   number
    total:                 number
  }
  refacciones: RefaccionItem[]
}

async function main() {
  const dataFile = path.join(__dirname, 'data', 'refacciones_motos_supermoto.json')

  if (!fs.existsSync(dataFile)) {
    console.error(`\n❌ Archivo no encontrado: ${dataFile}\n`)
    process.exit(1)
  }

  const data: SeedData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'))
  const MOTIVO = `Factura Supermoto ${data.factura.numero}`

  const totalPiezas = data.refacciones.reduce((s, r) => s + r.stockActual, 0)
  console.log(`\n📦  Cargando inventario Supermoto`)
  console.log(`    Claves  : ${data.refacciones.length}`)
  console.log(`    Piezas  : ${totalPiezas}`)
  console.log(`    Factura : ${data.factura.numero}  ($${data.factura.total.toFixed(2)})\n`)

  // ── 1. Upsert proveedor ────────────────────────────────────────
  // rfc no existe en el modelo → lo guardamos en `contacto`
  const descuentoPct = Math.round(data.factura.descuento / data.factura.subtotalAntesDescuento * 100)
  const ivaPct       = Math.round(data.factura.iva / data.factura.subtotal * 100)

  const proveedor = await prisma.proveedor.upsert({
    where:  { nombre: data.proveedor.nombre },
    update: {
      contacto:            `RFC: ${data.proveedor.rfc}`,
      ivaPocentaje:        ivaPct,
      descuentoPorcentaje: descuentoPct,
    },
    create: {
      nombre:              data.proveedor.nombre,
      contacto:            `RFC: ${data.proveedor.rfc}`,
      ivaPocentaje:        ivaPct,
      descuentoPorcentaje: descuentoPct,
    },
  })
  console.log(`✅  Proveedor "${proveedor.nombre}" (descuento ${descuentoPct}%, IVA ${ivaPct}%)`)

  // ── 2. Factura de proveedor (idempotente) ──────────────────────
  const facturaExistente = await prisma.facturaProveedor.findFirst({
    where: { numeroFactura: data.factura.numero, proveedorId: proveedor.id },
  })

  if (facturaExistente) {
    console.log(`ℹ️   Factura ${data.factura.numero} ya registrada`)
  } else {
    await prisma.facturaProveedor.create({
      data: {
        numeroFactura:       data.factura.numero,
        fecha:               new Date(data.factura.fecha),
        subtotal:            data.factura.subtotal,
        ivaPorcentaje:       ivaPct,
        ivaImporte:          data.factura.iva,
        descuentoPorcentaje: descuentoPct,
        descuentoImporte:    data.factura.descuento,
        totalPagar:          data.factura.total,
        pagada:              true,
        notas:               `Descuento ${descuentoPct}% aplicado ANTES del IVA. Bruto $${data.factura.subtotalAntesDescuento.toFixed(2)}, neto $${data.factura.subtotal.toFixed(2)}.`,
        proveedorId:         proveedor.id,
      },
    })
    console.log(`✅  Factura ${data.factura.numero} registrada ($${data.factura.total.toFixed(2)})`)
  }

  // ── 3. Refacciones + movimientos (idempotente por refaccion) ───
  let refCreadas      = 0
  let refActualizadas = 0
  let stockSumado     = 0
  let stockOmitido    = 0

  for (const item of data.refacciones) {
    // La categoria va como prefijo en descripcion (no existe campo categoria)
    const descripcionFinal = `[MOTO - ${item.categoria}] ${item.descripcion}`

    const existia = await prisma.refaccion.findUnique({ where: { codigo: item.codigo } })

    const ref = await prisma.refaccion.upsert({
      where:  { codigo: item.codigo },
      update: {
        nombre:          item.nombre,
        descripcion:     descripcionFinal,
        marca:           item.marca,
        unidad:          item.unidad,
        costoCompra:     item.costoCompra,
        margenGanancia:  item.margenGanancia,
        precioMostrador: item.precioMostrador,
        precioTaller:    item.precioTaller,
        precioMayoreo:   item.precioMayoreo ?? null,
        stockMinimo:     item.stockMinimo,
        proveedorId:     proveedor.id,
      },
      create: {
        codigo:          item.codigo,
        nombre:          item.nombre,
        descripcion:     descripcionFinal,
        marca:           item.marca,
        unidad:          item.unidad,
        stockActual:     0,
        stockMinimo:     item.stockMinimo,
        costoCompra:     item.costoCompra,
        margenGanancia:  item.margenGanancia,
        precioMostrador: item.precioMostrador,
        precioTaller:    item.precioTaller,
        precioMayoreo:   item.precioMayoreo ?? null,
        activo:          true,
        proveedorId:     proveedor.id,
      },
    })

    existia ? refActualizadas++ : refCreadas++

    // Idempotencia: ¿ya se registró esta entrada para esta factura?
    const movExistente = await prisma.movimientoInventario.findFirst({
      where: { refaccionId: ref.id, motivo: MOTIVO },
    })

    if (movExistente) {
      stockOmitido += item.stockActual
    } else {
      await prisma.$transaction([
        prisma.refaccion.update({
          where: { id: ref.id },
          data:  { stockActual: { increment: item.stockActual } },
        }),
        prisma.movimientoInventario.create({
          data: {
            tipo:        'ENTRADA',
            cantidad:    item.stockActual,
            motivo:      MOTIVO,
            refaccionId: ref.id,
          },
        }),
      ])
      stockSumado += item.stockActual
    }
  }

  // ── 4. Resumen ─────────────────────────────────────────────────
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊  RESUMEN — Inventario Supermoto`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`   Claves procesadas    : ${data.refacciones.length}`)
  console.log(`     · nuevas           : ${refCreadas}`)
  console.log(`     · actualizadas     : ${refActualizadas}`)
  console.log(`   Piezas de stock`)
  console.log(`     · agregadas        : ${stockSumado}`)
  console.log(`     · omitidas (ya ok) : ${stockOmitido}`)
  console.log(`   Factura              : ${data.factura.numero}`)
  console.log(`     · bruto            : $${data.factura.subtotalAntesDescuento.toFixed(2)}`)
  console.log(`     · descuento ${descuentoPct}%    : -$${data.factura.descuento.toFixed(2)}`)
  console.log(`     · subtotal neto    : $${data.factura.subtotal.toFixed(2)}`)
  console.log(`     · IVA ${ivaPct}%          : +$${data.factura.iva.toFixed(2)}`)
  console.log(`     · total pagado     : $${data.factura.total.toFixed(2)}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
}

main()
  .catch((e) => { console.error('❌ Error en seed-motos:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
