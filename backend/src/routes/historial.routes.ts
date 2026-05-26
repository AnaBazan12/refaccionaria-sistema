import { Router } from 'express'
import { historialVehiculo } from '../controllers/historial.controller'

const router = Router()

// Ruta pública — sin protegerRuta
router.get('/:placa', historialVehiculo)

export default router
