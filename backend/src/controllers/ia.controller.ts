import { Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { RequestConUsuario } from '../middlewares/auth.middleware'

export const diagnosticoIA = async (req: RequestConUsuario, res: Response) => {
  try {
    // ── Verificar que la API key esté configurada ─────────────
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey.trim() === '') {
      return res.status(503).json({
        mensaje: 'El asistente de IA no está configurado. Agrega ANTHROPIC_API_KEY en las variables de entorno del servidor.'
      })
    }

    const { vehiculo, falla, kilometraje, pregunta } = req.body

    if (!pregunta?.trim()) {
      return res.status(400).json({ mensaje: 'La pregunta es requerida' })
    }

    // ── Construir contexto de la orden ────────────────────────
    const contexto = [
      vehiculo?.marca    && `Vehículo: ${vehiculo.marca} ${vehiculo.modelo ?? ''} ${vehiculo.anio ?? ''}`.trim(),
      vehiculo?.placa    && `Placa: ${vehiculo.placa}`,
      kilometraje        && `Kilometraje: ${Number(kilometraje).toLocaleString('es-MX')} km`,
      falla              && `Falla reportada por el cliente: "${falla}"`,
    ].filter(Boolean).join('\n')

    const sistemaPrompt = `Eres un asistente técnico de taller mecánico automotriz experimentado.
Respondes en español mexicano, de forma directa y práctica para mecánicos.
Cuando diagnostiques una falla:
1. Lista las causas probables de más común a menos común
2. Indica pasos concretos de verificación
3. Menciona las herramientas necesarias si aplica
4. Si hay riesgo de seguridad, menciónalo primero

Sé breve pero completo. Usa listas numeradas o con guiones. Sin markdown complejo.`

    const mensajeUsuario = contexto
      ? `Contexto de la orden:\n${contexto}\n\nPregunta del mecánico: ${pregunta}`
      : pregunta

    // ── Llamada a la API (cliente creado aquí para usar la key actual) ──
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 700,
      system:     sistemaPrompt,
      messages:   [{ role: 'user', content: mensajeUsuario }],
    })

    const respuesta = message.content[0].type === 'text'
      ? message.content[0].text
      : 'Sin respuesta del asistente.'

    return res.json({ respuesta })

  } catch (error: any) {
    console.error('Error IA:', error?.message ?? error)

    // Error específico de Anthropic: API key inválida
    if (error?.status === 401) {
      return res.status(503).json({
        mensaje: 'La API key de Anthropic no es válida. Verifica ANTHROPIC_API_KEY en Railway.'
      })
    }

    // Error de modelo no encontrado
    if (error?.status === 404) {
      return res.status(503).json({
        mensaje: 'Modelo de IA no disponible. Contacta al administrador del sistema.'
      })
    }

    // Cuota excedida
    if (error?.status === 429) {
      return res.status(503).json({
        mensaje: 'Límite de uso del asistente alcanzado. Intenta en unos minutos.'
      })
    }

    return res.status(500).json({
      mensaje: error?.message ?? 'Error al consultar el asistente de IA'
    })
  }
}
