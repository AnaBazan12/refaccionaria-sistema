import { Router } from 'express'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'
import { getConfig, updateConfig, updateLogo }  from '../controllers/config.controller'

const router = Router()

router.get('/',     protegerRuta, getConfig)
router.put('/',     protegerRuta, soloRoles('ADMIN'), updateConfig)
router.put('/logo', protegerRuta, soloRoles('ADMIN'), updateLogo)

export default router
