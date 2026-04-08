import { Router } from 'express'
import {
  obtenerServicios,
  obtenerServicioPorId,
  crearServicio,
  actualizarServicio,
  eliminarServicio
} from '../controllers/tipoServicio.controller'
import { protegerRuta } from '../middlewares/auth.middleware'

const router = Router()

router.use(protegerRuta)

router.get('/', obtenerServicios)
router.get('/:id', obtenerServicioPorId)
router.post('/', crearServicio)
router.put('/:id', actualizarServicio)
router.delete('/:id', eliminarServicio)

export default router