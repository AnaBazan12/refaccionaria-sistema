import { Router } from 'express'
import {
  obtenerRefacciones, obtenerRefaccionPorId, buscarRefaccion,
  crearRefaccion, actualizarRefaccion, entradaInventario, eliminarRefaccion
} from '../controllers/refaccion.controller'
import { protegerRuta } from '../middlewares/auth.middleware'
import { validar, schemaCliente, schemaRefaccion } from '../utils/validaciones'
const router = Router()
router.use(protegerRuta)

router.get('/',               obtenerRefacciones)   // ?stockBajo=true
router.get('/buscar',         buscarRefaccion)       // ?q=balata
router.get('/:id',            obtenerRefaccionPorId)
router.post('/',              crearRefaccion)
router.put('/:id',            actualizarRefaccion)
router.post('/:id/entrada',   entradaInventario)
router.delete('/:id',         eliminarRefaccion)
router.post('/',    protegerRuta, validar(schemaRefaccion), crearRefaccion)
router.put('/:id',  protegerRuta, validar(schemaRefaccion.partial()), actualizarRefaccion)

export default router 