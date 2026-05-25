import { Router } from 'express'
import {
  obtenerCotizaciones, obtenerCotizacionPorId,
  crearCotizacion, aprobarCotizacion, convertirEnOrden,
  rechazarCotizacion, eliminarCotizacion
} from '../controllers/cotizacion.controller'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.get('/',                              obtenerCotizaciones)
router.get('/:id',                           obtenerCotizacionPorId)
router.post('/',                             crearCotizacion)
router.patch('/:id/aprobar',                 soloRoles('ADMIN','RECEPCIONISTA'), aprobarCotizacion)
router.patch('/:id/convertir',               soloRoles('ADMIN','RECEPCIONISTA'), convertirEnOrden)
router.patch('/:id/rechazar',                rechazarCotizacion)
router.delete('/:id',                        soloRoles('ADMIN','RECEPCIONISTA'), eliminarCotizacion)

export default router