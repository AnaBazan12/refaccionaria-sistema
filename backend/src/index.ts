import express    from 'express'
import cors       from 'cors'
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

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3000

// ── CORS — permitir frontend en producción y local ────────────
const origenes = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sin origin (Postman, mobile, curl)
    if (!origin || origenes.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`⚠️ CORS bloqueado para origen: ${origin}`)
      callback(new Error(`CORS bloqueado: ${origin}`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))

// ── Health check ──────────────────────────────────────────────
app.get('/',        (_req, res) => res.json({ status: 'ok' }))
app.get('/health',  (_req, res) => res.json({
  status:    'ok',
  timestamp: new Date().toISOString(),
  env:       process.env.NODE_ENV,
  origenes:  origenes  // 👈 útil para debuggear que FRONTEND_URL se cargó
}))

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes)
app.use('/api/clientes',    clienteRoutes)
app.use('/api/vehiculos',   vehiculoRoutes)
app.use('/api/mecanicos',   mecanicoRoutes)
app.use('/api/servicios',   tipoServicioRoutes)
app.use('/api/ordenes',     ordenRoutes)
app.use('/api/refacciones', refaccionRoutes)
app.use('/api/ventas',      ventaRoutes)
app.use('/api/proveedores', proveedorRoutes)
app.use('/api/reportes',    reporteRoutes)
app.use('/api/pdf',         pdfRoutes)
app.use('/api/cotizaciones',cotizacionRoutes)

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
  console.log(`🌐 Orígenes CORS permitidos:`, origenes)  // 👈 verifica en logs
})