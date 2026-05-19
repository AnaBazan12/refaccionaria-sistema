import { Router } from 'express'
import { diagnosticoIA } from '../controllers/ia.controller'
import { protegerRuta } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.post('/diagnostico', diagnosticoIA)

export default router
