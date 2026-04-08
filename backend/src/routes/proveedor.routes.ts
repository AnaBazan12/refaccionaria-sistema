import { Router } from 'express'
import {
  obtenerProveedores, crearProveedor, actualizarProveedor,
  calcularFactura, obtenerFacturas, marcarFacturaPagada
} from '../controllers/proveedor.controller'
import { protegerRuta } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.get('/',                    obtenerProveedores)
router.post('/',                   crearProveedor)
router.put('/:id',                 actualizarProveedor)
router.post('/facturas/calcular',  calcularFactura)
router.get('/facturas',            obtenerFacturas)
router.patch('/facturas/:id/pagar',marcarFacturaPagada)

export default router