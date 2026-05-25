import { Router } from 'express'
import { busquedaGlobal } from '../controllers/busqueda.controller'
import { protegerRuta }   from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.get('/', busquedaGlobal)

export default router
