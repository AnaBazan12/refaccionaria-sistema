import { Router } from 'express'
import {
  obtenerMecanicos, obtenerMecanicoPorId,
  crearMecanico, actualizarMecanico, eliminarMecanico
} from '../controllers/mecanico.controller'
import { protegerRuta } from '../middlewares/auth.middleware'
import { soloRoles }    from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.get('/', obtenerMecanicos)
router.get('/:id', obtenerMecanicoPorId)

// Solo ADMIN puede crear, editar y eliminar mecánicos
router.post('/',   soloRoles('ADMIN'), crearMecanico)
router.put('/:id', soloRoles('ADMIN'), actualizarMecanico)
router.delete('/:id', soloRoles('ADMIN'), eliminarMecanico)

export default router