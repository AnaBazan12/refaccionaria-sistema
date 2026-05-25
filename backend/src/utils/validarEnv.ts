/**
 * Valida que las variables de entorno críticas estén configuradas.
 * Si falta alguna, imprime un error claro y termina el proceso.
 * Se llama UNA VEZ al arrancar el servidor.
 */
export const validarEnv = () => {
  const REQUERIDAS = [
    { key: 'DATABASE_URL',  desc: 'Conexión a PostgreSQL' },
    { key: 'JWT_SECRET',    desc: 'Clave secreta para tokens JWT' },
  ]

  const OPCIONALES = [
    { key: 'ANTHROPIC_API_KEY', desc: 'Asistente IA (deshabilitado si falta)' },
    { key: 'FRONTEND_URL',      desc: 'URL del frontend para CORS' },
    { key: 'NEGOCIO_NOMBRE',    desc: 'Nombre del negocio en PDFs' },
    { key: 'NEGOCIO_TELEFONO',  desc: 'Teléfono del negocio en PDFs' },
    { key: 'NEGOCIO_DIRECCION', desc: 'Dirección del negocio en PDFs' },
  ]

  const faltantes: string[] = []

  for (const v of REQUERIDAS) {
    if (!process.env[v.key]) {
      faltantes.push(`  ✗ ${v.key.padEnd(20)} — ${v.desc}`)
    }
  }

  if (faltantes.length > 0) {
    console.error('\n❌ VARIABLES DE ENTORNO REQUERIDAS FALTANTES:')
    faltantes.forEach(f => console.error(f))
    console.error('\nConfigúralas en Railway → Variables antes de continuar.\n')
    process.exit(1)
  }

  // Advertencias para opcionales
  const avisos: string[] = []
  for (const v of OPCIONALES) {
    if (!process.env[v.key]) {
      avisos.push(`  ⚠ ${v.key.padEnd(20)} — ${v.desc}`)
    }
  }

  if (avisos.length > 0) {
    console.warn('\n⚠️  Variables opcionales no configuradas:')
    avisos.forEach(a => console.warn(a))
    console.warn('')
  }
}
