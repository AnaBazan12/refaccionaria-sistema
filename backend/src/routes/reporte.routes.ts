import { Router } from 'express'
import {
  reporteDiario,
  reporteMensual,
  alertaStockBajo,
  historialVehiculo
} from '../controllers/reporte.controller'
import {
  pdfReporteDiario,
  pdfReporteMensual
} from '../controllers/reporte.pdf.controller'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.get('/diario',                protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), reporteDiario)
router.get('/mensual',               protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), reporteMensual)
router.get('/stock-bajo',            protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), alertaStockBajo)
router.get('/historial/:vehiculoId', protegerRuta, historialVehiculo)

// ── Exportación PDF ───────────────────────────────────────────
router.get('/pdf/diario',   protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), pdfReporteDiario)
router.get('/pdf/mensual',  protegerRuta, soloRoles('ADMIN', 'RECEPCIONISTA'), pdfReporteMensual)

export default router