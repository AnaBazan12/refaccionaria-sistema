import express    from 'express'
import helmet     from 'helmet'
import rateLimit  from 'express-rate-limit'
import compression from 'compression'
import dotenv     from 'dotenv'
import path       from 'path'
import fs         from 'fs'
import { validarEnv }    from './utils/validarEnv'
import authRoutes        from './routes/auth.routes'
import clienteRoutes     from './routes/cliente.routes'
import vehiculoRoutes    from './routes/vehiculo.routes'
import mecanicoRoutes    from './routes/mecanico.routes'
import tipoServicioRoutes from './routes/tipoServicio.routes'
import ordenRoutes       from './routes/orden.routes'
import refaccionRoutes   from './routes/refaccion.routes'
import ventaRoutes       from './routes/venta.routes'
import proveedorRoutes   from './routes/proveedor.routes'
import reporteRoutes     from './routes/reporte.routes'
import pdfRoutes         from './routes/pdf.routes'
import cotizacionRoutes  from './routes/cotizacion.routes'
import iaRoutes          from './routes/ia.routes'
import dashboardRoutes   from './routes/dashboard.routes'
import cajaRoutes        from './routes/caja.routes'
import compraRoutes      from './routes/compra.routes'
import busquedaRoutes    from './routes/busqueda.routes'
import configRoutes      from './routes/config.routes'
import cfdiRoutes        from './routes/cfdi.routes'
import historialRoutes   from './routes/historial.routes'
import exportarRoutes    from './routes/exportar.routes'

dotenv.config()
validarEnv()   // ← falla rápido si falta configuración crítica

const app  = express()
const PORT = process.env.PORT || 4000

// ── CORS — debe ir ANTES de helmet ───────────────────────────
// Se maneja manualmente para máxima compatibilidad con Railway + Vercel
const origenesPermitidos = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

const CORS_ABIERTO = process.env.CORS_ABIERTO === 'true'

const esOrigenPermitido = (origin: string | undefined): boolean => {
  if (CORS_ABIERTO) return true                                       // variable de emergencia
  if (!origin) return true
  if (origenesPermitidos.includes(origin)) return true
  if (/https:\/\/refaccionaria-sistema.*\.vercel\.app$/.test(origin)) return true
  return false
}

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin as string | undefined
  const permitido = esOrigenPermitido(origin)

  if (permitido) {
    res.setHeader('Access-Control-Allow-Origin',      origin ?? '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods',     'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers',     'Content-Type,Authorization')
  } else {
    console.warn(`⚠️ CORS bloqueado para origen: ${origin}`)
  }

  // Preflight — responde inmediatamente sin pasar por más middleware
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  next()
})

// ── Seguridad HTTP headers ────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite recursos desde otros orígenes
}))

// ── Compresión gzip — reduce hasta 70% el tamaño de respuestas ─
app.use(compression())

app.use(express.json({ limit: '10mb' }))

// ── Rate limiting — protege el login contra fuerza bruta ──────
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // máximo 20 intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: 'Demasiados intentos. Espera 15 minutos antes de reintentar.' },
})

// ── Health check ──────────────────────────────────────────────
app.get('/',       (_req, res) => res.json({ status: 'ok' }))
app.get('/health', (_req, res) => res.json({
  status:    'ok',
  timestamp: new Date().toISOString(),
  env:       process.env.NODE_ENV,
  version:   'compras-v1',
  routes:    ['POST /api/compras', 'GET /api/compras'],
}))

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/auth',         limiterAuth, authRoutes)
app.use('/api/clientes',     clienteRoutes)
app.use('/api/vehiculos',    vehiculoRoutes)
app.use('/api/mecanicos',    mecanicoRoutes)
app.use('/api/servicios',    tipoServicioRoutes)
app.use('/api/ordenes',      ordenRoutes)
app.use('/api/refacciones',  refaccionRoutes)
app.use('/api/ventas',       ventaRoutes)
app.use('/api/proveedores',  proveedorRoutes)
app.use('/api/reportes',     reporteRoutes)
app.use('/api/pdf',          pdfRoutes)
app.use('/api/cotizaciones', cotizacionRoutes)
app.use('/api/ia',          iaRoutes)
app.use('/api/dashboard',   dashboardRoutes)
app.use('/api/caja',        cajaRoutes)
app.use('/api/compras',     compraRoutes)
app.use('/api/buscar',      busquedaRoutes)
app.use('/api/config',      configRoutes)
app.use('/api/cfdi',        cfdiRoutes)
app.use('/api/historial',   historialRoutes)   // público — sin auth
app.use('/api/exportar',    exportarRoutes)

// ── Manejo de errores global ──────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response,
         _next: express.NextFunction) => {
  console.error('Error no manejado:', err)
  res.status(500).json({
    mensaje: 'Error interno del servidor',
    error:   process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// ── Servir frontend (modo local/estático) ─────────────────────
// Si existe el build del frontend en ../frontend/dist, lo sirve aquí
const frontendDist = path.resolve(__dirname, '../../frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
  console.log(`🖥️  Sirviendo frontend desde: ${frontendDist}`)
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
  console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Orígenes CORS permitidos:`, origenesPermitidos)
  console.log(`✅ Rutas caja: GET /api/caja/resumen | POST /api/caja/gastos | DELETE /api/caja/gastos/:id`)
  console.log(`🔖 Deploy: ${new Date().toISOString()}`)
})
