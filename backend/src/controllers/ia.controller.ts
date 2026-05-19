import { Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { RequestConUsuario } from '../middlewares/auth.middleware'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const diagnosticoIA = async (req: RequestConUsuario, res: Response) => {
  try {
    const { vehiculo, falla, kilometraje, pregunta } = req.body

    if (!pregunta?.trim()) {
      return res.status(400).json({ mensaje: 'La pregunta es requerida' })
    }

    const contexto = [
      vehiculo?.marca    && `Vehículo: ${vehiculo.marca} ${vehiculo.modelo ?? ''} ${vehiculo.anio ?? ''}`.trim(),
      vehiculo?.placa    && `Placa: ${vehiculo.placa}`,
      kilometraje        && `Kilometraje: ${kilometraje.toLocaleString('es-MX')} km`,
      falla              && `Falla reportada por el cliente: "${falla}"`,
    ].filter(Boolean).join('\n')

    const sistemaPrompt = `Eres un asistente técnico de taller mecánico automotriz.
Respondes en español, de forma directa y práctica.
Cuando diagnostiques, lista: causas probables (de más a menos común), pasos de verificación concretos, y herramientas necesarias.
Sé breve pero completo. No uses markdown excesivo — texto plano con listas cortas.`

    const mensajeUsuario = contexto
      ? `Contexto de la orden:\n${contexto}\n\nPregunta del mecánico: ${pregunta}`
      : pregunta

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: sistemaPrompt,
      messages: [{ role: 'user', content: mensajeUsuario }],
    })

    const respuesta = message.content[0].type === 'text' ? message.content[0].text : ''

    return res.json({ respuesta })
  } catch (error: any) {
    console.error('Error IA:', error)
    return res.status(500).json({ mensaje: 'Error al consultar el asistente de IA' })
  }
}
