import express    from 'express'
import helmet     from 'helmet'
import rateLimit  from 'express-rate-limit'
import dotenv     from 'dotenv'
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

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 4000

// ── CORS — debe ir ANTES de helmet ───────────────────────────
// Se maneja manualmente para máxima compatibilidad con Railway + Vercel
const origenesPermitidos = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

const esOrigenPermitido = (origin: string | undefined): boolean => {
  if (!origin) return true
  if (origenesPermitidos.includes(origin)) return true
  if (/https:\/\/refaccionaria-sistema.*\.vercel\.app$/.test(origin)) return true
  return false
}

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (esOrigenPermitido(origin)) {
    res.setHeader('Access-Control-Allow-Origin',      origin ?? '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods',     'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers',     'Content-Type,Authorization')
  } else {
    console.warn(`⚠️ CORS bloqueado para origen: ${origin}`)
  }
  // Preflight — responde inmediatamente
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

// ── Seguridad HTTP headers ────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite recursos desde otros orígenes
}))

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

// ── Manejo de errores global ──────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response,
         _next: express.NextFunction) => {
  console.error('Error no manejado:', err)
  res.status(500).json({
    mensaje: 'Error interno del servidor',
    error:   process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
  console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Orígenes CORS permitidos:`, origenesPermitidos)
})
