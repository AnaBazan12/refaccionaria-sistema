import { Router } from 'express'
import { getDashboard } from '../controllers/dashboard.controller'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'

const router = Router()

router.get('/', protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), getDashboard)

export default router
