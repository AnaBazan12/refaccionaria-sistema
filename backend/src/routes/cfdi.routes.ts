import { Router } from 'express'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'
import {
  uploadCsd,
  crearFactura,
  listarCfdis,
  descargarPdf,
  descargarXml,
  cancelarFactura,
} from '../controllers/cfdi.controller'

const router = Router()

// Todas las rutas requieren autenticación
router.use(protegerRuta)

router.get('/',           listarCfdis)
router.post('/csd',       soloRoles('ADMIN'), uploadCsd)
router.post('/crear',     crearFactura)
router.get('/:id/pdf',    descargarPdf)
router.get('/:id/xml',    descargarXml)
router.delete('/:id',     soloRoles('ADMIN'), cancelarFactura)

export default router
