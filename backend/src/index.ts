import express    from 'express'
import cors       from 'cors'
import dotenv     from 'dotenv'
import authRoutes         from './routes/auth.routes'
import clienteRoutes      from './routes/cliente.routes'
import vehiculoRoutes     from './routes/vehiculo.routes'
import mecanicoRoutes     from './routes/mecanico.routes'
import tipoServicioRoutes from './routes/tipoServicio.routes'
import ordenRoutes        from './routes/orden.routes'
import refaccionRoutes    from './routes/refaccion.routes'
import ventaRoutes        from './routes/venta.routes'
import proveedorRoutes    from './routes/proveedor.routes'
import reporteRoutes      from './routes/reporte.routes'
import pdfRoutes          from './routes/pdf.routes'
import cotizacionRoutes   from './routes/cotizacion.routes'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3000

// ── CONFIGURACIÓN DE CORS MEJORADA ────────────────────────────
const origenesPermitidos = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL
].filter(Boolean) as string[]

// ── CONFIGURACIÓN DE CORS "INTELIGENTE" ────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    const origenesEstaticos = [
      'https://refaccionaria-sistema.vercel.app',
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ];
    
    // Verificamos si el origen es de Vercel (incluyendo ramas de previsualización)
    const esVercel = origin?.endsWith('.vercel.app');

    if (!origin || origenesEstaticos.includes(origin) || esVercel) {
      callback(null, true);
    } else {
      console.error('CORS Bloqueado para:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }))

// ── Health check ──────────────────────────────────────────────
app.get('/',        (_req, res) => res.json({ status: 'ok' }))
app.get('/health',  (_req, res) => res.json({
  status:    'ok',
  timestamp: new Date().toISOString(),
  env:       process.env.NODE_ENV
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
})