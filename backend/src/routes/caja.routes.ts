import { Router } from 'express'
import { resumenCaja } from '../controllers/caja.controller'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.get('/resumen', soloRoles('ADMIN', 'RECEPCIONISTA'), resumenCaja)

export default router
