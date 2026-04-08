import { Router }        from 'express'
import { pdfOrden, pdfCotizacion ,mensajeWhatsApp } from '../controllers/pdf.controller'
import { protegerRuta }  from '../middlewares/auth.middleware'


const router = Router()
router.use(protegerRuta)

router.get('/orden/:id',       pdfOrden)
router.get('/cotizacion/:id',  pdfCotizacion)

router.get('/whatsapp/:id', mensajeWhatsApp)

export default router