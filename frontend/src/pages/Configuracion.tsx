import { useEffect, useState } from 'react'
import api from '../services/api'

interface Config {
  nombre:    string
  subtitulo: string
  telefono:  string
  direccion: string
  ciudad:    string
  rfc:       string
  email:     string
  horario:   string
}

const CAMPOS: { key: keyof Config; label: string; placeholder: string; icono: string; required?: boolean }[] = [
  { key: 'nombre',    label: 'Nombre del negocio',    placeholder: 'Ej. Taller Mecánico García',              icono: '🏢', required: true },
  { key: 'subtitulo', label: 'Eslogan / subtítulo',   placeholder: 'Ej. Servicio mecánico profesional',       icono: '✏️' },
  { key: 'telefono',  label: 'Teléfono',              placeholder: 'Ej. 443 123 4567',                        icono: '📞' },
  { key: 'email',     label: 'Correo electrónico',    placeholder: 'Ej. contacto@mitaller.mx',                icono: '📧' },
  { key: 'direccion', label: 'Dirección',             placeholder: 'Ej. Av. Morelos 123, Col. Centro',        icono: '📍' },
  { key: 'ciudad',    label: 'Ciudad / Municipio',    placeholder: 'Ej. Morelia, Michoacán',                  icono: '🏙️' },
  { key: 'rfc',       label: 'RFC',                   placeholder: 'Ej. XAXX010101000',                       icono: '🧾' },
  { key: 'horario',   label: 'Horario de atención',   placeholder: 'Ej. Lun–Sáb 8:00–19:00',                 icono: '🕐' },
]

export default function Configuracion() {
  const [config,    setConfig]    = useState<Config>({
    nombre: '', subtitulo: '', telefono: '', direccion: '',
    ciudad: '', rfc: '', email: '', horario: '',
  })
  const [cargando,  setCargando]  = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [ok,        setOk]        = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    api.get('/config')
      .then(({ data }) => setConfig({
        nombre:    data.nombre    ?? '',
        subtitulo: data.subtitulo ?? '',
        telefono:  data.telefono  ?? '',
        direccion: data.direccion ?? '',
        ciudad:    data.ciudad    ?? '',
        rfc:       data.rfc       ?? '',
        email:     data.email     ?? '',
        horario:   data.horario   ?? '',
      }))
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setCargando(false))
  }, [])

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOk(false)
    if (!config.nombre.trim()) { setError('El nombre del negocio es requerido'); return }
    setGuardando(true)
    try {
      await api.put('/config', config)
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configuración del negocio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Esta información aparece en los PDFs, cotizaciones y mensajes de WhatsApp.
        </p>
      </div>

      {/* Vista previa del encabezado del PDF */}
      <div className="bg-gray-900 rounded-2xl p-5 text-white">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">
          Vista previa — encabezado del PDF
        </p>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shrink-0">
            {config.nombre.charAt(0).toUpperCase() || 'T'}
          </div>
          <div>
            <p className="font-bold text-base leading-tight">
              {config.nombre || 'Nombre del negocio'}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {config.subtitulo || 'Eslogan del negocio'}
            </p>
            {config.telefono && (
              <p className="text-gray-500 text-xs mt-1">Tel. {config.telefono}</p>
            )}
            {(config.direccion || config.ciudad) && (
              <p className="text-gray-500 text-xs">
                Dir. {[config.direccion, config.ciudad].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleGuardar} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CAMPOS.map(({ key, label, placeholder, icono, required }) => (
            <div key={key} className={key === 'nombre' || key === 'subtitulo' || key === 'direccion' ? 'sm:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {icono} {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input
                type={key === 'email' ? 'email' : 'text'}
                value={config[key]}
                onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {ok && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <span>✅</span> Configuración guardada correctamente
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white
                       font-semibold px-8 py-2.5 rounded-xl text-sm transition-colors
                       flex items-center gap-2"
          >
            {guardando ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando…
              </>
            ) : (
              '💾 Guardar cambios'
            )}
          </button>
        </div>
      </form>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">💡 ¿Para qué sirve esto?</p>
        <ul className="space-y-1 text-blue-600 text-xs list-disc list-inside">
          <li>Tu nombre y teléfono aparecen al pie de cada PDF de orden y cotización</li>
          <li>Los mensajes de WhatsApp incluyen el nombre del taller automáticamente</li>
          <li>El RFC se puede usar en facturas cuando se integre facturación</li>
        </ul>
      </div>

    </div>
  )
}
