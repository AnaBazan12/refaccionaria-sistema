import { Router } from 'express'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'
import {
  exportarOrdenes,
  exportarClientes,
  exportarInventario,
  exportarDeudas,
} from '../controllers/exportar.controller'

const router = Router()

router.use(protegerRuta)
router.use(soloRoles('ADMIN', 'RECEPCIONISTA'))

router.get('/ordenes',     exportarOrdenes)
router.get('/clientes',    exportarClientes)
router.get('/inventario',  exportarInventario)
router.get('/deudas',      exportarDeudas)

export default router
