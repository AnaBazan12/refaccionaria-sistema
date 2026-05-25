/**
 * Seed de datos demo para TallerPro
 * Crea un usuario demo + datos de muestra para presentar el sistema
 * Uso: npx tsx prisma/seed.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/client'
import { PrismaPg }     from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed de datos demo...')

  // ── 1. Usuario demo ────────────────────────────────────────────
  const hash = await bcrypt.hash('Demo1234', 10)

  const demo = await prisma.usuario.upsert({
    where: { email: 'demo@tallerpro.mx' },
    update: {},
    create: {
      nombre:   'Demo TallerPro',
      email:    'demo@tallerpro.mx',
      password: hash,
      rol:      'ADMIN',
      activo:   true,
    },
  })
  console.log('✅ Usuario demo creado:', demo.email)

  // ── 2. Mecánico vinculado al demo ─────────────────────────────
  await prisma.mecanico.upsert({
    where: { usuarioId: demo.id },
    update: {},
    create: {
      nombre:      'Carlos Ramírez',
      telefono:    '4431112233',
      especialidad:'Diésel y eléctrico',
      usuarioId:   demo.id,
    },
  })

  // Mecánico adicional sin usuario
  const mec2 = await prisma.mecanico.upsert({
    where:  { usuarioId: undefined as any },
    update: {},
    create: {
      nombre:      'Luis Hernández',
      telefono:    '4439988776',
      especialidad:'Frenos y suspensión',
    },
  }).catch(() => prisma.mecanico.findFirst({ where: { nombre: 'Luis Hernández' } }))

  // ── 3. Tipos de servicio ──────────────────────────────────────
  const tiposData = [
    { nombre: 'Cambio de aceite',           precioBase: 350 },
    { nombre: 'Afinación menor',            precioBase: 800 },
    { nombre: 'Afinación mayor',            precioBase: 1500 },
    { nombre: 'Frenos delanteros',          precioBase: 600 },
    { nombre: 'Diagnóstico computarizado',  precioBase: 300 },
    { nombre: 'Balanceo y alineación',      precioBase: 400 },
    { nombre: 'Cambio de clutch',           precioBase: 2500 },
  ]
  const tipos: Record<string, any> = {}
  for (const t of tiposData) {
    tipos[t.nombre] = await prisma.tipoServicio.upsert({
      where:  { nombre: t.nombre },
      update: {},
      create: { nombre: t.nombre, precioBase: t.precioBase, activo: true },
    })
  }
  console.log('✅ Tipos de servicio listos')

  // ── 4. Refacciones ────────────────────────────────────────────
  const refaccionesData = [
    { nombre: 'Filtro de aceite',        codigo: 'FIL-001', marca: 'Bosch',   stock: 24, costo: 85,  precio: 150  },
    { nombre: 'Filtro de aire',          codigo: 'FIL-002', marca: 'Mann',    stock: 15, costo: 120, precio: 220  },
    { nombre: 'Bujías NGK (juego de 4)', codigo: 'BUJ-001', marca: 'NGK',     stock: 10, costo: 280, precio: 480  },
    { nombre: 'Pastillas de freno del.', codigo: 'FRE-001', marca: 'Bendix',  stock: 8,  costo: 320, precio: 560  },
    { nombre: 'Aceite 5W30 sintético',   codigo: 'ACE-001', marca: 'Mobil 1', stock: 30, costo: 145, precio: 250  },
    { nombre: 'Balata trasera',          codigo: 'FRE-002', marca: 'Bendix',  stock: 6,  costo: 280, precio: 490  },
    { nombre: 'Disco de freno',          codigo: 'FRE-003', marca: 'Brembo',  stock: 4,  costo: 650, precio: 1100 },
    { nombre: 'Banda de distribución',   codigo: 'MOT-001', marca: 'Gates',   stock: 3,  costo: 480, precio: 850  },
    { nombre: 'Amortiguador delantero',  codigo: 'SUS-001', marca: 'Monroe',  stock: 4,  costo: 780, precio: 1350 },
    { nombre: 'Foco H4 (par)',           codigo: 'ELE-001', marca: 'Philips', stock: 12, costo: 95,  precio: 180  },
    { nombre: 'Líquido de frenos DOT4',  codigo: 'FRE-004', marca: 'Castrol', stock: 20, costo: 65,  precio: 120  },
    { nombre: 'Termostato',              codigo: 'MOT-002', marca: 'Gates',   stock: 5,  costo: 190, precio: 340  },
  ]
  const refs: Record<string, any> = {}
  for (const r of refaccionesData) {
    refs[r.codigo] = await prisma.refaccion.upsert({
      where:  { codigo: r.codigo },
      update: {},
      create: {
        nombre:          r.nombre,
        codigo:          r.codigo,
        marca:           r.marca,
        stockActual:     r.stock,
        stockMinimo:     3,
        costoCompra:     r.costo,
        precioMostrador: r.precio,
        precioTaller:    r.precio,
        activo:          true,
      },
    })
  }
  console.log('✅ Refacciones listas')

  // ── 5. Clientes ───────────────────────────────────────────────
  const clientesData = [
    { nombre: 'Roberto González',   telefono: '4431234567', email: 'roberto@demo.mx' },
    { nombre: 'María López',        telefono: '4437654321', email: 'maria@demo.mx'   },
    { nombre: 'Juan Carlos Pérez',  telefono: '4439876543', email: 'juan@demo.mx'    },
    { nombre: 'Sofía Martínez',     telefono: '4432345678', email: 'sofia@demo.mx'   },
    { nombre: 'Transportes Morelia',telefono: '4434567890', email: 'trans@demo.mx'   },
  ]
  const clientes: Record<string, any> = {}
  for (const c of clientesData) {
    clientes[c.email] = await prisma.cliente.upsert({
      where:  { email: c.email },
      update: {},
      create: c,
    })
  }
  console.log('✅ Clientes listos')

  // ── 6. Vehículos ──────────────────────────────────────────────
  const vehiculosData = [
    { placa: 'ABC-123', marca: 'Chevrolet', modelo: 'Aveo',    anio: 2018, color: 'Blanco',  clienteEmail: 'roberto@demo.mx' },
    { placa: 'XYZ-456', marca: 'Volkswagen',modelo: 'Jetta',   anio: 2020, color: 'Gris',    clienteEmail: 'maria@demo.mx'   },
    { placa: 'DEF-789', marca: 'Nissan',    modelo: 'Versa',   anio: 2019, color: 'Negro',   clienteEmail: 'juan@demo.mx'    },
    { placa: 'GHI-321', marca: 'Toyota',    modelo: 'Hilux',   anio: 2021, color: 'Blanco',  clienteEmail: 'sofia@demo.mx'   },
    { placa: 'JKL-654', marca: 'Ford',      modelo: 'F-150',   anio: 2017, color: 'Rojo',    clienteEmail: 'trans@demo.mx'   },
    { placa: 'MNO-987', marca: 'Honda',     modelo: 'Civic',   anio: 2022, color: 'Azul',    clienteEmail: 'roberto@demo.mx' },
  ]
  const vehiculos: Record<string, any> = {}
  for (const v of vehiculosData) {
    vehiculos[v.placa] = await prisma.vehiculo.upsert({
      where:  { placa: v.placa },
      update: {},
      create: {
        placa:      v.placa,
        marca:      v.marca,
        modelo:     v.modelo,
        anio:       v.anio,
        color:      v.color,
        clienteId:  clientes[v.clienteEmail].id,
      },
    })
  }
  console.log('✅ Vehículos listos')

  // ── 7. Mecánico 2 lookup ──────────────────────────────────────
  const mecanicoLuis = await prisma.mecanico.findFirst({ where: { nombre: 'Luis Hernández' } })
  const mecanicoCarlos = await prisma.mecanico.findFirst({ where: { usuarioId: demo.id } })

  // ── 8. Órdenes de trabajo ─────────────────────────────────────
  const ordenesExistentes = await prisma.ordenTrabajo.count()
  if (ordenesExistentes < 6) {
    // Orden 1: Entregada y pagada
    const o1 = await prisma.ordenTrabajo.create({
      data: {
        estado:       'ENTREGADO',
        estadoPago:   'PAGADO',
        diagnostico:  'Cambio de aceite y filtros. Afinación menor preventiva.',
        observaciones:'Cliente solicita revisión general antes de viaje largo.',
        kilometraje:  68500,
        fechaPromesa: new Date(Date.now() - 5 * 86400000),
        fechaEntrega: new Date(Date.now() - 4 * 86400000),
        totalManoObra:    350,
        totalRefacciones: 370,
        total:            720,
        totalPagado:      720,
        saldoPendiente:   0,
        pagado:           true,
        clienteId:    clientes['roberto@demo.mx'].id,
        vehiculoId:   vehiculos['ABC-123'].id,
        mecanicoId:   mecanicoCarlos?.id,
        creadoPorId:  demo.id,
        servicios: {
          create: [{ tipoServicioId: tipos['Cambio de aceite'].id, precio: 350, descripcion: 'Aceite 5W30 sintético' }]
        },
        detalles: {
          create: [
            { refaccionId: refs['FIL-001'].id, cantidad: 1, precioUnitario: 150, subtotal: 150 },
            { refaccionId: refs['ACE-001'].id, cantidad: 4, precioUnitario: 55,  subtotal: 220 },
          ]
        },
        pagos: {
          create: [{
            monto: 720, tipo: 'CONTADO', metodo: 'EFECTIVO',
            concepto: 'Pago total', creadoPorId: demo.id
          }]
        }
      },
    })

    // Orden 2: Lista para entregar
    await prisma.ordenTrabajo.create({
      data: {
        estado:       'LISTO',
        estadoPago:   'PARCIAL',
        diagnostico:  'Frenos delanteros gastados. Se cambian pastillas y se rectifican discos.',
        kilometraje:  45200,
        fechaPromesa: new Date(Date.now() + 1 * 86400000),
        totalManoObra:    600,
        totalRefacciones: 560,
        total:            1160,
        totalPagado:      500,
        saldoPendiente:   660,
        pagado:           false,
        clienteId:    clientes['maria@demo.mx'].id,
        vehiculoId:   vehiculos['XYZ-456'].id,
        mecanicoId:   mecanicoLuis?.id,
        creadoPorId:  demo.id,
        servicios: {
          create: [{ tipoServicioId: tipos['Frenos delanteros'].id, precio: 600, descripcion: 'Revisión y cambio completo' }]
        },
        detalles: {
          create: [
            { refaccionId: refs['FRE-001'].id, cantidad: 1, precioUnitario: 560, subtotal: 560 },
          ]
        },
        pagos: {
          create: [{ monto: 500, tipo: 'ANTICIPO', metodo: 'TRANSFERENCIA', concepto: 'Anticipo', creadoPorId: demo.id }]
        }
      },
    })

    // Orden 3: En proceso
    await prisma.ordenTrabajo.create({
      data: {
        estado:       'EN_PROCESO',
        estadoPago:   'PENDIENTE',
        diagnostico:  'Diagnóstico computarizado: falla en sensor de oxígeno y se requiere afinación mayor.',
        kilometraje:  92800,
        fechaPromesa: new Date(Date.now() + 2 * 86400000),
        totalManoObra:    1800,
        totalRefacciones: 760,
        total:            2560,
        totalPagado:      0,
        saldoPendiente:   2560,
        pagado:           false,
        clienteId:    clientes['juan@demo.mx'].id,
        vehiculoId:   vehiculos['DEF-789'].id,
        mecanicoId:   mecanicoCarlos?.id,
        creadoPorId:  demo.id,
        servicios: {
          create: [
            { tipoServicioId: tipos['Diagnóstico computarizado'].id, precio: 300 },
            { tipoServicioId: tipos['Afinación mayor'].id,           precio: 1500 },
          ]
        },
        detalles: {
          create: [
            { refaccionId: refs['BUJ-001'].id, cantidad: 1, precioUnitario: 480, subtotal: 480 },
            { refaccionId: refs['FIL-002'].id, cantidad: 1, precioUnitario: 220, subtotal: 220 },
            { refaccionId: refs['FIL-001'].id, cantidad: 1, precioUnitario: 150, subtotal: 150 },
          ]
        },
      },
    })

    // Orden 4: Esperando refacción
    await prisma.ordenTrabajo.create({
      data: {
        estado:       'EN_ESPERA_REFACCION',
        estadoPago:   'PENDIENTE',
        diagnostico:  'Amortiguadores delanteros en mal estado. En espera de piezas del proveedor.',
        kilometraje:  130000,
        fechaPromesa: new Date(Date.now() + 4 * 86400000),
        totalManoObra:    800,
        totalRefacciones: 2700,
        total:            3500,
        totalPagado:      1000,
        saldoPendiente:   2500,
        pagado:           false,
        clienteId:    clientes['sofia@demo.mx'].id,
        vehiculoId:   vehiculos['GHI-321'].id,
        mecanicoId:   mecanicoLuis?.id,
        creadoPorId:  demo.id,
        pagos: {
          create: [{ monto: 1000, tipo: 'ANTICIPO', metodo: 'EFECTIVO', concepto: 'Anticipo inicial', creadoPorId: demo.id }]
        }
      },
    })

    // Orden 5: Recién recibida
    await prisma.ordenTrabajo.create({
      data: {
        estado:       'RECIBIDO',
        estadoPago:   'PENDIENTE',
        diagnostico:  'Revisión general de unidad de trabajo. Ruido extraño en motor al acelerar.',
        kilometraje:  78600,
        fechaPromesa: new Date(Date.now() + 3 * 86400000),
        totalManoObra:    300,
        totalRefacciones: 0,
        total:            300,
        totalPagado:      0,
        saldoPendiente:   300,
        pagado:           false,
        clienteId:    clientes['trans@demo.mx'].id,
        vehiculoId:   vehiculos['JKL-654'].id,
        creadoPorId:  demo.id,
        servicios: {
          create: [{ tipoServicioId: tipos['Diagnóstico computarizado'].id, precio: 300 }]
        },
      },
    })

    console.log('✅ Órdenes de trabajo listas')
  } else {
    console.log('ℹ️  Órdenes ya existen, omitiendo...')
  }

  // ── 9. Cotización de muestra ──────────────────────────────────
  const cotExistentes = await prisma.cotizacion.count()
  if (cotExistentes < 2) {
    await prisma.cotizacion.create({
      data: {
        estado:         'PENDIENTE',
        notas:          'Cliente interesado en cambio de clutch. Se le cotiza mano de obra y refacción.',
        subtotal:       3350,
        total:          3350,
        clienteId:      clientes['roberto@demo.mx'].id,
        vehiculoId:     vehiculos['MNO-987'].id,
        creadoPorId:    demo.id,
        items: {
          create: [
            { tipoServicioId: tipos['Cambio de clutch'].id, cantidad: 1, precioUnitario: 2500, subtotal: 2500 },
          ]
        }
      }
    })
    console.log('✅ Cotizaciones listas')
  }

  // ── 10. Movimientos de caja (gastos) ──────────────────────────
  const gastosExistentes = await prisma.gastoCaja.count()
  if (gastosExistentes < 3) {
    await prisma.gastoCaja.createMany({
      data: [
        { concepto: 'Compra de aceite a granel (20L)', monto: 1400, categoria: 'REFACCIONES', metodoPago: 'EFECTIVO',      usuarioId: demo.id },
        { concepto: 'Pago servicios luz taller',       monto: 850,  categoria: 'SERVICIOS',   metodoPago: 'TRANSFERENCIA', usuarioId: demo.id },
        { concepto: 'Herramienta neumática',      monto: 2300, categoria: 'OTROS',       metodoPago: 'EFECTIVO',      usuarioId: demo.id },
      ],
      skipDuplicates: true,
    })
    console.log('✅ Gastos de caja listos')
  }

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📧 Email:    demo@tallerpro.mx')
  console.log('🔑 Password: Demo1234')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
