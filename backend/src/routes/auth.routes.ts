import { Router } from 'express'
import { registrar, login, obtenerUsurios, obtenerUsuarios,toggleActivo , cambiarPassword } from '../controllers/auth.controller'
import { protegerRuta } from '../middlewares/auth.middleware'

const router = Router()

router.post('/registro', registrar)
router.post('/login', login)
router.get('/usuarios', obtenerUsurios)
router.get('/usuarios', protegerRuta,      obtenerUsuarios)
router.patch('/usuarios/:id', protegerRuta, toggleActivo)
router.patch('/cambiar-password', protegerRuta, cambiarPassword)
export default router