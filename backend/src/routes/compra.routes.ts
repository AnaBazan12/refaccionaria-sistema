import { Router } from 'express'
import {
  registrarCompra, getCompras,
  eliminarCompra, marcarCompraPagada, comprasPorVencer
} from '../controllers/compra.controller'
import { protegerRuta, soloRoles } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.post('/',                  registrarCompra)   // registrar entrada
router.get('/',                   getCompras)        // listar compras con filtros
router.get('/por-vencer',         comprasPorVencer)  // créditos próximos a vencer
router.patch('/:id/pagar',        soloRoles('ADMIN', 'RECEPCIONISTA'), marcarCompraPagada)
router.delete('/:id',             soloRoles('ADMIN'), eliminarCompra)  // eliminar + revertir stock

export default router
