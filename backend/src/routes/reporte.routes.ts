import { Router } from 'express'
import {
  reporteDiario,
  reporteMensual,
  alertaStockBajo,
  historialVehiculo
} from '../controllers/reporte.controller'
import { protegerRuta } from '../middlewares/auth.middleware'
import { soloRoles } from '../middlewares/auth.middleware'


const router = Router()
router.use(protegerRuta)

router.get('/diario',            protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), reporteDiario)
router.get('/mensual',           protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), reporteMensual)
router.get('/stock-bajo',        protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), alertaStockBajo)
router.get('/historial/:vehiculoId', protegerRuta, historialVehiculo)
export default router