import { Router } from 'express'
import {
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente
} from '../controllers/cliente.controller'
import { protegerRuta } from '../middlewares/auth.middleware'
import { validar, schemaCliente } from '../utils/validaciones'

const router = Router()

// Todas las rutas de clientes requieren autenticación
router.use(protegerRuta)

router.get('/', obtenerClientes)
router.get('/:id', obtenerClientePorId)
router.post('/', crearCliente)
router.put('/:id', actualizarCliente)
router.delete('/:id', eliminarCliente)
router.post('/',    protegerRuta, validar(schemaCliente), crearCliente)
router.put('/:id',  protegerRuta, validar(schemaCliente.partial()), actualizarCliente)
export default router