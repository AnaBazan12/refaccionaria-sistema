import { Router } from 'express'
import {
  obtenerOrdenes, obtenerOrdenPorId,
  obtenerOrdenesPorVehiculo, crearOrden,
  cambiarEstado, marcarPagada,
  agregarServicio, cancelarOrden,
  archivarOrden, archivarOrdeneViejas   // ← agregar
} from '../controllers/orden.controller'
import {
  agregarRefaccion, quitarRefaccion, obtenerDetalle
} from '../controllers/ordenDetalle.controller'
import {
  registrarPago, obtenerPagos, clientesConDeuda
} from '../controllers/pago.controller'
import { obtenerBitacora } from '../controllers/orden.controller'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'
import { validar, schemaCliente, schemaOrden, schemaPago } from '../utils/validaciones'

const router = Router()
router.use(protegerRuta)

router.get('/', obtenerOrdenes)                               // ?estado=EN_PROCESO&pagado=false
router.get('/vehiculo/:vehiculoId', obtenerOrdenesPorVehiculo)
router.get('/:id', obtenerOrdenPorId)
router.post('/', crearOrden)
router.patch('/:id/estado', cambiarEstado)
router.patch('/:id/pagar', marcarPagada)
router.post('/:id/servicios', agregarServicio)
router.delete('/:id', cancelarOrden)
router.patch('/:id/archivar',    archivarOrden)
router.post('/archivar-viejas',    soloRoles('ADMIN'), archivarOrdeneViejas)
// Detalle refacciones
router.get('/:id/detalle',               obtenerDetalle)
router.post('/:id/detalle',              agregarRefaccion)
router.delete('/:id/detalle/:detalleId', quitarRefaccion)

// Pagos
router.get('/:id/pagos',    obtenerPagos)
router.post('/:id/pagos',   registrarPago)

// Bitácora
router.get('/:id/bitacora', obtenerBitacora)

// Deudas
router.get('/deudas/pendientes', protegerRuta, soloRoles('ADMIN','RECEPCIONISTA'), clientesConDeuda)
router.post('/',    protegerRuta, validar(schemaOrden), crearOrden)
router.put('/:id',  protegerRuta, validar(schemaPago.partial()), crearOrden)

export default router