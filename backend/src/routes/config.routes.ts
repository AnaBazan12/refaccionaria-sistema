import { Router } from 'express'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'
import { getConfig, updateConfig, updateLogo, resetDemo } from '../controllers/config.controller'

const router = Router()

router.get('/',           protegerRuta, getConfig)
router.put('/',           protegerRuta, soloRoles('ADMIN'), updateConfig)
router.put('/logo',       protegerRuta, soloRoles('ADMIN'), updateLogo)
router.delete('/reset',   protegerRuta, soloRoles('ADMIN'), resetDemo)

export default router
