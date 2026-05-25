import { Router } from 'express'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'
import { getConfig, updateConfig }  from '../controllers/config.controller'

const router = Router()

router.get('/',  protegerRuta, getConfig)
router.put('/',  protegerRuta, soloRoles('ADMIN'), updateConfig)

export default router
