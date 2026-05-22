import { Router } from 'express'
import { resumenCaja } from '../controllers/caja.controller'
import { registrarGasto, eliminarGasto } from '../controllers/gasto.controller'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.get('/resumen',       soloRoles('ADMIN', 'RECEPCIONISTA'), resumenCaja)
router.post('/gastos',       soloRoles('ADMIN', 'RECEPCIONISTA'), registrarGasto)
router.delete('/gastos/:id', soloRoles('ADMIN', 'RECEPCIONISTA'), eliminarGasto)

export default router
