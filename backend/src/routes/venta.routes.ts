import { Router } from 'express'
import {
  registrarVenta, registrarTicket,
  ventasDelDia, reporteMensual,
  historialVentasCliente
} from '../controllers/venta.controller'
import { protegerRuta } from '../middlewares/auth.middleware'

const router = Router()
router.use(protegerRuta)

router.post('/',                     registrarVenta)
router.post('/ticket',               registrarTicket)            // venta con múltiples items
router.get('/dia',                   ventasDelDia)               // ?fecha=2024-03-15
router.get('/mensual',               reporteMensual)             // ?mes=3&anio=2024
router.get('/cliente/:clienteId',    historialVentasCliente)     // historial de un cliente

export default router