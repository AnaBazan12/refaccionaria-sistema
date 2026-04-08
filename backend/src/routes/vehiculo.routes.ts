import { Router } from 'express'
import {
  obtenerVehiculos,
  obtenerVehiculoPorId,
  obtenerVehiculosPorCliente,
  buscarPorPlaca,
  crearVehiculo,
  actualizarVehiculo,
  eliminarVehiculo
} from '../controllers/vehiculo.controller'
import { protegerRuta } from '../middlewares/auth.middleware'
import { validar, schemaCliente, schemaVehiculo } from '../utils/validaciones'

const router = Router()

router.use(protegerRuta)

router.get('/', obtenerVehiculos)
router.get('/placa/:placa', buscarPorPlaca)       // Búsqueda rápida por placa
router.get('/cliente/:clienteId', obtenerVehiculosPorCliente)
router.get('/:id', obtenerVehiculoPorId)
router.post('/', crearVehiculo)
router.put('/:id', actualizarVehiculo)
router.delete('/:id', eliminarVehiculo)
router.post('/',    protegerRuta, validar(schemaVehiculo), crearVehiculo)
router.put('/:id',  protegerRuta, validar(schemaVehiculo.partial()), actualizarVehiculo)

export default router