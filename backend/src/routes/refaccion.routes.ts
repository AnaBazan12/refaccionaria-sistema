import { Router } from 'express'
import {
  obtenerRefacciones, obtenerRefaccionPorId, buscarRefaccion,
  crearRefaccion, actualizarRefaccion, entradaInventario, eliminarRefaccion,
  metricasInventario, movimientosRefaccion, ajustarInventario
} from '../controllers/refaccion.controller'
import { protegerRuta } from '../middlewares/auth.middleware'
import { validar, schemaRefaccion } from '../utils/validaciones'
const router = Router()
router.use(protegerRuta)

router.get('/',               obtenerRefacciones)   // ?stockBajo=true
router.get('/metricas',       metricasInventario)    // métricas financieras globales
router.get('/buscar',         buscarRefaccion)       // ?q=balata
router.get('/:id',            obtenerRefaccionPorId)
router.post('/',              validar(schemaRefaccion), crearRefaccion)
router.put('/:id',            validar(schemaRefaccion.partial()), actualizarRefaccion)
router.post('/:id/entrada',   entradaInventario)
router.post('/:id/ajuste',    ajustarInventario)
router.get('/:id/movimientos',movimientosRefaccion)
router.delete('/:id',         eliminarRefaccion)

export default router 