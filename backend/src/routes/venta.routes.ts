import { Router } from 'express'
import { registrarVenta, ventasDelDia, reporteMensual } from '../controllers/venta.controller'
import { protegerRuta } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.post('/',          registrarVenta)
router.get('/dia',        ventasDelDia)    // ?fecha=2024-03-15
router.get('/mensual',    reporteMensual)  // ?mes=3&anio=2024

export default router