import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { subirCsd } from '../services/cfdi.service'

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

interface CfdiConfig {
  cfdiRegimenFiscal:  string
  cfdiCodigoPostal:   string
  cfdiSerie:          string
  cfdiFacturamaUser:  string
  cfdiFacturamaPass:  string
  cfdiSandbox:        boolean
  cfdiCsdSubido:      boolean
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
  const [cargando,       setCargando]       = useState(true)
  const [guardando,      setGuardando]      = useState(false)
  const [guardandoLogo,  setGuardandoLogo]  = useState(false)
  const [ok,             setOk]             = useState(false)
  const [okLogo,         setOkLogo]         = useState(false)
  const [error,          setError]          = useState('')
  const [errorLogo,      setErrorLogo]      = useState('')
  const [limpiando,      setLimpiando]      = useState(false)
  const [confirmReset,   setConfirmReset]   = useState(false)

  // CFDI / Facturación
  const [cfdi,           setCfdi]           = useState<CfdiConfig>({
    cfdiRegimenFiscal: '', cfdiCodigoPostal: '', cfdiSerie: 'A',
    cfdiFacturamaUser: '', cfdiFacturamaPass: '',
    cfdiSandbox: true, cfdiCsdSubido: false,
  })
  const [guardandoCfdi,  setGuardandoCfdi]  = useState(false)
  const [okCfdi,         setOkCfdi]         = useState(false)
  const [errorCfdi,      setErrorCfdi]      = useState('')

  // CSD upload
  const [cerBase64,      setCerBase64]      = useState('')
  const [keyBase64,      setKeyBase64]      = useState('')
  const [keyPass,        setKeyPass]        = useState('')
  const [subiendoCsd,    setSubiendoCsd]    = useState(false)
  const [okCsd,          setOkCsd]          = useState(false)
  const [errorCsd,       setErrorCsd]       = useState('')
  const cerRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)

  // Logo: base64 sin prefijo (igual que lo guarda la BD)
  const [logoGuardado,   setLogoGuardado]   = useState<string | null>(null)
  const [logoPreview,    setLogoPreview]    = useState<string | null>(null)  // con prefijo para <img>
  const [logoBase64,     setLogoBase64]     = useState<string | null>(null)  // sin prefijo, para enviar
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get('/config')
      .then(({ data }) => {
        setConfig({
          nombre:    data.nombre    ?? '',
          subtitulo: data.subtitulo ?? '',
          telefono:  data.telefono  ?? '',
          direccion: data.direccion ?? '',
          ciudad:    data.ciudad    ?? '',
          rfc:       data.rfc       ?? '',
          email:     data.email     ?? '',
          horario:   data.horario   ?? '',
        })
        if (data.logo) {
          setLogoGuardado(data.logo)
          setLogoPreview(`data:image/png;base64,${data.logo}`)
        }
        setCfdi({
          cfdiRegimenFiscal: data.cfdiRegimenFiscal ?? '',
          cfdiCodigoPostal:  data.cfdiCodigoPostal  ?? '',
          cfdiSerie:         data.cfdiSerie         ?? 'A',
          cfdiFacturamaUser: data.cfdiFacturamaUser ?? '',
          cfdiFacturamaPass: data.cfdiFacturamaPass ?? '',
          cfdiSandbox:       data.cfdiSandbox       ?? true,
          cfdiCsdSubido:     data.cfdiCsdSubido     ?? false,
        })
      })
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setCargando(false))
  }, [])

  /* ── Manejo del archivo de logo ─────────────────────────── */
  const onArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    if (archivo.size > 2_000_000) {
      setErrorLogo('La imagen es demasiado grande. Máximo ~1.5 MB.')
      return
    }
    if (!archivo.type.startsWith('image/')) {
      setErrorLogo('Solo se aceptan imágenes (PNG, JPG, WebP).')
      return
    }

    setErrorLogo('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      // dataUrl = "data:image/png;base64,XXXX..."
      const base64 = dataUrl.split(',')[1]
      setLogoPreview(dataUrl)
      setLogoBase64(base64)
    }
    reader.readAsDataURL(archivo)
  }

  const handleGuardarLogo = async () => {
    if (!logoBase64) return
    setErrorLogo('')
    setGuardandoLogo(true)
    try {
      await api.put('/config/logo', { logo: logoBase64 })
      setLogoGuardado(logoBase64)
      setLogoBase64(null)   // ya no hay cambio pendiente
      setOkLogo(true)
      setTimeout(() => setOkLogo(false), 3000)
    } catch (err: any) {
      setErrorLogo(err.response?.data?.mensaje ?? 'Error al guardar logo')
    } finally {
      setGuardandoLogo(false)
    }
  }

  const handleEliminarLogo = async () => {
    setErrorLogo('')
    setGuardandoLogo(true)
    try {
      await api.put('/config/logo', { logo: null })
      setLogoGuardado(null)
      setLogoPreview(null)
      setLogoBase64(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: any) {
      setErrorLogo(err.response?.data?.mensaje ?? 'Error al eliminar logo')
    } finally {
      setGuardandoLogo(false)
    }
  }

  /* ── Guardar datos del negocio ──────────────────────────── */
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

  /* ── Guardar config CFDI ───────────────────────────────── */
  const handleGuardarCfdi = async () => {
    setErrorCfdi('')
    setOkCfdi(false)
    setGuardandoCfdi(true)
    try {
      await api.put('/config', {
        cfdiRegimenFiscal: cfdi.cfdiRegimenFiscal,
        cfdiCodigoPostal:  cfdi.cfdiCodigoPostal,
        cfdiSerie:         cfdi.cfdiSerie,
        cfdiFacturamaUser: cfdi.cfdiFacturamaUser,
        cfdiFacturamaPass: cfdi.cfdiFacturamaPass,
        cfdiSandbox:       cfdi.cfdiSandbox,
      })
      setOkCfdi(true)
      setTimeout(() => setOkCfdi(false), 3000)
    } catch (err: any) {
      setErrorCfdi(err.response?.data?.mensaje ?? 'Error al guardar')
    } finally {
      setGuardandoCfdi(false)
    }
  }

  /* ── Leer archivo .cer o .key y convertir a base64 ──────── */
  const leerArchivoBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string
        // data:application/...;base64,XXXX → tomar solo XXXX
        const b64 = result.includes(',') ? result.split(',')[1] : result
        resolve(b64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const onCerSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setCerBase64(await leerArchivoBase64(file)) }
    catch { setErrorCsd('Error leyendo archivo .cer') }
  }

  const onKeySeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setKeyBase64(await leerArchivoBase64(file)) }
    catch { setErrorCsd('Error leyendo archivo .key') }
  }

  const handleSubirCsd = async () => {
    setErrorCsd('')
    if (!cerBase64 || !keyBase64 || !keyPass) {
      setErrorCsd('Selecciona el .cer, el .key y escribe la contraseña')
      return
    }
    setSubiendoCsd(true)
    try {
      await subirCsd({ cerBase64, keyBase64, keyPass })
      setCfdi(prev => ({ ...prev, cfdiCsdSubido: true }))
      setOkCsd(true)
      setCerBase64('')
      setKeyBase64('')
      setKeyPass('')
      if (cerRef.current) cerRef.current.value = ''
      if (keyRef.current) keyRef.current.value = ''
    } catch (err: any) {
      setErrorCsd(err.response?.data?.mensaje ?? err.message ?? 'Error al subir CSD')
    } finally {
      setSubiendoCsd(false)
    }
  }

  const handleReset = async () => {
    setLimpiando(true)
    try {
      await api.delete('/config/reset')
      setConfirmReset(false)
      alert('✅ Base de datos limpiada. Ya puedes empezar a usar el sistema con datos reales.')
    } catch (err: any) {
      alert(err.response?.data?.mensaje ?? 'Error al limpiar datos')
    } finally {
      setLimpiando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const logoActual = logoPreview  // puede ser el guardado o uno recién seleccionado

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configuración del negocio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Esta información aparece en los PDFs, cotizaciones y mensajes de WhatsApp.
        </p>
      </div>

      {/* ── Sección de logo ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Logo del negocio</h2>

        <div className="flex items-start gap-5">

          {/* Preview */}
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300
                            bg-gray-50 flex items-center justify-center">
              {logoActual ? (
                <img
                  src={logoActual}
                  alt="Logo del negocio"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <div className="text-3xl">🏢</div>
                  <div className="text-xs text-gray-400 mt-1">Sin logo</div>
                </div>
              )}
            </div>
          </div>

          {/* Controles */}
          <div className="flex-1 space-y-3">
            <p className="text-xs text-gray-500">
              PNG, JPG o WebP — máximo 1.5 MB.<br/>
              Recomendado: fondo transparente (PNG), mínimo 200×200 px.
            </p>

            <div className="flex flex-wrap gap-2">
              {/* Botón seleccionar archivo */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs
                           font-medium rounded-lg transition-colors"
              >
                {logoActual ? '🔄 Cambiar logo' : '📁 Subir logo'}
              </button>

              {/* Guardar logo (solo si hay cambio pendiente) */}
              {logoBase64 && (
                <button
                  type="button"
                  onClick={handleGuardarLogo}
                  disabled={guardandoLogo}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400
                             text-white text-xs font-medium rounded-lg transition-colors
                             flex items-center gap-1.5"
                >
                  {guardandoLogo ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : '💾'}
                  Guardar logo
                </button>
              )}

              {/* Eliminar logo (solo si hay logo guardado) */}
              {logoGuardado && !logoBase64 && (
                <button
                  type="button"
                  onClick={handleEliminarLogo}
                  disabled={guardandoLogo}
                  className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50
                             text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  🗑 Eliminar logo
                </button>
              )}
            </div>

            {/* Feedback logo */}
            {errorLogo && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {errorLogo}
              </p>
            )}
            {okLogo && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
                ✅ Logo guardado — aparecerá en todos los PDFs
              </p>
            )}
            {logoBase64 && !okLogo && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                Logo seleccionado — presiona "Guardar logo" para aplicarlo
              </p>
            )}
          </div>
        </div>

        {/* Input oculto */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onArchivoSeleccionado}
        />
      </div>

      {/* Vista previa del encabezado del PDF */}
      <div className="bg-gray-900 rounded-2xl p-5 text-white">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">
          Vista previa — encabezado del PDF
        </p>
        <div className="flex items-start gap-4">
          {/* Logo en preview */}
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-600 flex items-center
                          justify-center text-white font-black text-xl shrink-0">
            {logoActual ? (
              <img src={logoActual} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              config.nombre.charAt(0).toUpperCase() || 'T'
            )}
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

      {/* Formulario datos del negocio */}
      <form onSubmit={handleGuardar} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">

        <h2 className="text-sm font-bold text-gray-700">Datos del negocio</h2>

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

      {/* ── Sección Facturación CFDI ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-700">Facturación electrónica (CFDI 4.0)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Integración con Facturama — PAC certificado por el SAT
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              cfdi.cfdiSandbox
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {cfdi.cfdiSandbox ? 'Modo pruebas' : 'Producción'}
            </span>
            {cfdi.cfdiCsdSubido && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                CSD subido
              </span>
            )}
          </div>
        </div>

        {/* Campos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Usuario Facturama</label>
            <input
              value={cfdi.cfdiFacturamaUser}
              onChange={e => setCfdi(p => ({ ...p, cfdiFacturamaUser: e.target.value }))}
              placeholder="tu-usuario-facturama"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña Facturama</label>
            <input
              type="password"
              value={cfdi.cfdiFacturamaPass}
              onChange={e => setCfdi(p => ({ ...p, cfdiFacturamaPass: e.target.value }))}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Régimen fiscal (emisor)</label>
            <select
              value={cfdi.cfdiRegimenFiscal}
              onChange={e => setCfdi(p => ({ ...p, cfdiRegimenFiscal: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Selecciona —</option>
              <option value="601">601 — General de Ley Personas Morales</option>
              <option value="612">612 — Personas Físicas con Actividades Empresariales</option>
              <option value="616">616 — Sin obligaciones fiscales</option>
              <option value="626">626 — RESICO</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">CP domicilio fiscal</label>
            <input
              value={cfdi.cfdiCodigoPostal}
              onChange={e => setCfdi(p => ({ ...p, cfdiCodigoPostal: e.target.value }))}
              placeholder="58000"
              maxLength={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Serie de folios</label>
            <input
              value={cfdi.cfdiSerie}
              onChange={e => setCfdi(p => ({ ...p, cfdiSerie: e.target.value.toUpperCase().slice(0,3) }))}
              placeholder="A"
              maxLength={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cfdi.cfdiSandbox}
                onChange={e => setCfdi(p => ({ ...p, cfdiSandbox: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-checked:bg-amber-500 rounded-full peer
                              after:content-[''] after:absolute after:top-0.5 after:left-0.5
                              after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                              peer-checked:after:translate-x-5" />
            </label>
            <span className="text-sm text-gray-700">
              {cfdi.cfdiSandbox ? 'Modo pruebas (sandbox)' : 'Producción (facturas reales)'}
            </span>
          </div>
        </div>

        {errorCfdi && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{errorCfdi}</p>
        )}
        {okCfdi && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
            ✅ Configuración de facturación guardada
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleGuardarCfdi}
            disabled={guardandoCfdi}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700
                       disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {guardandoCfdi ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '💾'}
            Guardar configuración CFDI
          </button>
        </div>

        {/* CSD upload */}
        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-xs font-bold text-gray-600 mb-1">Subir Certificado de Sello Digital (CSD)</h3>
          <p className="text-xs text-gray-400 mb-4">
            Solo se necesita hacer una vez. Sube tus archivos .cer y .key del CSD.
            {cfdi.cfdiCsdSubido && (
              <span className="ml-2 text-green-600 font-medium">✅ Ya está subido</span>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Archivo .cer</label>
              <button
                type="button"
                onClick={() => cerRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-lg px-3 py-2.5 text-xs text-center
                            transition-colors ${cerBase64
                              ? 'border-green-400 text-green-600 bg-green-50'
                              : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}
              >
                {cerBase64 ? '✅ .cer cargado' : '📁 Seleccionar .cer'}
              </button>
              <input ref={cerRef} type="file" accept=".cer" className="hidden" onChange={onCerSeleccionado} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Archivo .key</label>
              <button
                type="button"
                onClick={() => keyRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-lg px-3 py-2.5 text-xs text-center
                            transition-colors ${keyBase64
                              ? 'border-green-400 text-green-600 bg-green-50'
                              : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}
              >
                {keyBase64 ? '✅ .key cargado' : '📁 Seleccionar .key'}
              </button>
              <input ref={keyRef} type="file" accept=".key" className="hidden" onChange={onKeySeleccionado} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña del .key</label>
              <input
                type="password"
                value={keyPass}
                onChange={e => setKeyPass(e.target.value)}
                placeholder="Contraseña CSD"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {errorCsd && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{errorCsd}</p>
          )}
          {okCsd && (
            <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              ✅ CSD subido exitosamente a Facturama
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleSubirCsd}
              disabled={subiendoCsd || (!cerBase64 && !keyBase64)}
              className="flex items-center gap-2 px-5 py-2 bg-gray-800 hover:bg-gray-900
                         disabled:bg-gray-400 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {subiendoCsd ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : '🔐'}
              Subir CSD a Facturama
            </button>
          </div>
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">💡 ¿Para qué sirve esto?</p>
        <ul className="space-y-1 text-blue-600 text-xs list-disc list-inside">
          <li>Tu logo aparece en el encabezado de cada PDF de orden, cotización y reporte mensual</li>
          <li>Tu nombre y teléfono se muestran junto al logo en todos los documentos</li>
          <li>Los mensajes de WhatsApp incluyen el nombre del taller automáticamente</li>
          <li>El RFC se puede usar en facturas cuando se integre facturación</li>
        </ul>
      </div>

      {/* Zona de peligro */}
      <div className="border border-red-200 rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-red-700">⚠️ Zona de peligro</h2>
        <p className="text-xs text-gray-500">
          Borra todos los clientes, vehículos, órdenes, inventario, ventas y compras.
          Conserva tus usuarios, servicios y configuración del negocio.
          Úsalo para arrancar con datos reales después de probar el sistema.
        </p>

        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="px-5 py-2.5 border border-red-300 text-red-600 text-sm font-semibold
                       rounded-xl hover:bg-red-50 transition-colors"
          >
            🗑 Limpiar todos los datos de prueba
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-bold text-red-700">
              ¿Estás seguro? Esta acción no se puede deshacer.
            </p>
            <p className="text-xs text-red-500">
              Se borrarán permanentemente todos los clientes, órdenes, inventario, ventas y compras.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={limpiando}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400
                           text-white text-sm font-bold rounded-xl transition-colors
                           flex items-center gap-2"
              >
                {limpiando ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : '🗑'}
                {limpiando ? 'Limpiando...' : 'Sí, borrar todo'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-5 py-2 border border-gray-300 text-gray-600 text-sm
                           font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
