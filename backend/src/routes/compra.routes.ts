import { Router } from 'express'
import { registrarCompra, getCompras } from '../controllers/compra.controller'
import { protegerRuta } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.post('/',  registrarCompra)  // registrar entrada de inventario
router.get('/',   getCompras)       // listar compras con filtros

export default router
