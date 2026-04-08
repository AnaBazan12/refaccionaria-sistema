import { Router } from 'express'
import {
  obtenerCotizaciones, obtenerCotizacionPorId,
  crearCotizacion, convertirEnOrden, rechazarCotizacion
} from '../controllers/cotizacion.controller'
import { protegerRuta } from '../middlewares/auth.middleware'
import { soloRoles }    from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.get('/',                              obtenerCotizaciones)
router.get('/:id',                           obtenerCotizacionPorId)
router.post('/',                             crearCotizacion)
router.patch('/:id/convertir',               soloRoles('ADMIN','RECEPCIONISTA'), convertirEnOrden)
router.patch('/:id/rechazar',                rechazarCotizacion)

export default router