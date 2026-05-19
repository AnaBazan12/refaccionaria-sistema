import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginService } from '../services/auth.service'
import api from '../services/api'

type Pantalla = 'login' | 'registro' | 'forgot' | 'exito'
type Rol      = 'RECEPCIONISTA' | 'MECANICO' | 'ADMIN'

const rolesConfig = [
  { valor: 'RECEPCIONISTA' as Rol, label: 'Recepcionista', icono: '📋' },
  { valor: 'MECANICO'      as Rol, label: 'Mecánico',      icono: '🔧' },
  { valor: 'ADMIN'         as Rol, label: 'Admin',         icono: '⚙️' },
]

const pwdFortaleza = (v: string) => {
  let score = 0
  if (v.length >= 6)          score++
  if (v.length >= 10)         score++
  if (/[A-Z]/.test(v))       score++
  if (/[0-9]/.test(v))       score++
  if (/[^A-Za-z0-9]/.test(v)) score++
  const niveles = [
    { pct: 0,   color: '#e5e7eb', label: 'Escribe una contraseña' },
    { pct: 20,  color: '#E24B4A', label: 'Muy débil'  },
    { pct: 40,  color: '#EF9F27', label: 'Débil'      },
    { pct: 65,  color: '#EF9F27', label: 'Regular'    },
    { pct: 85,  color: '#1D9E75', label: 'Buena'      },
    { pct: 100, color: '#1D9E75', label: 'Fuerte'     },
  ]
  return niveles[score]
}

export default function Login() {
  const [pantalla, setPantalla] = useState<Pantalla>('login')
  const [tab,      setTab]      = useState<'login'|'registro'>('login')

  // Login
  const [lEmail,   setLEmail]   = useState('')
  const [lPass,    setLPass]    = useState('')
  const [lVerPass, setLVerPass] = useState(false)
  const [lError,   setLError]   = useState('')
  const [lCargando,setLCargando]= useState(false)

  // Registro
  const [rNombre,  setRNombre]  = useState('')
  const [rEmail,   setREmail]   = useState('')
  const [rTel,     setRTel]     = useState('')
  const [rRol,     setRRol]     = useState<Rol>('RECEPCIONISTA')
  const [rPass,    setRPass]    = useState('')
  const [rPass2,   setRPass2]   = useState('')
  const [rVerPass, setRVerPass] = useState(false)
  const [rError,   setRError]   = useState('')
  const [rCargando,setRCargando]= useState(false)

  // Forgot
  const [fEmail,   setFEmail]   = useState('')
  const [fMsg,     setFMsg]     = useState('')
  const [fError,   setFError]   = useState('')
  const [fInfo,    setFInfo]    = useState(false)
  const [fCargando,setFCargando]= useState(false)

  const { login }  = useAuth()
  const navigate   = useNavigate()
  const fortaleza  = pwdFortaleza(rPass)

  // ── Login ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLError('')
    if (!lEmail || !lPass) { setLError('Completa todos los campos'); return }
    setLCargando(true)
    try {
      const data = await loginService(lEmail, lPass)
      login(data.token, data.usuario)
      navigate('/dashboard')
    } catch (err: any) {
      setLError(err.response?.data?.mensaje || 'Credenciales inválidas')
    } finally {
      setLCargando(false)
    }
  }

  // ── Registro ──────────────────────────────────────────────
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setRError('')
    if (!rNombre || !rEmail || !rPass) {
      setRError('Completa todos los campos obligatorios'); return
    }
    if (rPass.length < 6) {
      setRError('La contraseña debe tener mínimo 6 caracteres'); return
    }
    if (rPass !== rPass2) {
      setRError('Las contraseñas no coinciden'); return
    }
    setRCargando(true)
    try {
      // El registro requiere token de admin — si no hay token
      // guardamos la solicitud y avisamos al admin
      const token = localStorage.getItem('token')
      await api.post('/auth/registro', {
        nombre:   rNombre,
        email:    rEmail,
        telefono: rTel || undefined,
        password: rPass,
        rol:      rRol
      }, token ? {
        headers: { Authorization: `Bearer ${token}` }
      } : {})

      setPantalla('exito')
    } catch (err: any) {
      setRError(
        err.response?.status === 401
          ? 'Solo el administrador puede crear cuentas. Contacta al admin.'
          : err.response?.data?.mensaje || 'Error al crear la cuenta'
      )
    } finally {
      setRCargando(false)
    }
  }

  // ── Olvidé contraseña ─────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setFError('')
    setFMsg('')
    if (!fEmail) { setFError('Ingresa tu correo'); return }
    setFCargando(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: fEmail })
      setFMsg(data.mensaje)
      setFInfo(true)
    } catch (err: any) {
      setFError(err.response?.data?.mensaje || 'Error al procesar la solicitud')
    } finally {
      setFCargando(false)
    }
  }

  // ── Clases compartidas ────────────────────────────────────
  const inputCls = `w-full border border-gray-300 rounded-lg px-3.5 py-2.5
                    text-sm focus:outline-none focus:ring-2 focus:ring-gray-400
                    bg-white dark:bg-gray-800 transition-colors`

  const btnPrimary = `w-full py-2.5 rounded-lg text-sm font-medium
                      bg-gray-900 hover:bg-gray-700 text-white
                      transition-colors disabled:opacity-50
                      disabled:cursor-not-allowed`

  return (
    <div className="min-h-screen bg-gray-50 flex items-center
                    justify-center p-4">
      <div className="w-full max-w-md">

        {/* ── Pantalla éxito ────────────────────────────── */}
        {pantalla === 'exito' && (
          <div className="bg-white rounded-2xl border border-gray-200
                          p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 border border-green-200
                            rounded-xl flex items-center justify-center
                            text-2xl mx-auto">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">
                Cuenta creada
              </h2>
              <p className="text-sm text-gray-500">
                Tu cuenta fue creada exitosamente. Ya puedes iniciar sesión
                con tus credenciales.
              </p>
            </div>
            <button
              onClick={() => { setPantalla('login'); setTab('login') }}
              className={btnPrimary}
            >
              Ir al login
            </button>
          </div>
        )}

        {/* ── Pantalla olvidé contraseña ────────────────── */}
        {pantalla === 'forgot' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-5">
              <button
                onClick={() => setPantalla('login')}
                className="flex items-center gap-1.5 text-sm text-gray-500
                           hover:text-gray-700 transition-colors"
              >
                ← Volver al login
              </button>

              <div>
                <div className="w-11 h-11 bg-amber-50 border border-amber-200
                                rounded-xl flex items-center justify-center
                                text-xl mb-4">
                  🔑
                </div>
                <h2 className="text-lg font-medium text-gray-900">
                  Recuperar contraseña
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Ingresa tu correo y te indicaremos los siguientes pasos
                </p>
              </div>

              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium
                                    text-gray-600 uppercase tracking-wide">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={fEmail}
                    onChange={e => setFEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className={inputCls}
                  />
                </div>

                {fError && (
                  <div className="bg-red-50 border border-red-200 text-red-700
                                  text-sm rounded-lg px-3.5 py-2.5">
                    {fError}
                  </div>
                )}

                {fMsg && (
                  <div className="bg-green-50 border border-green-200
                                  text-green-700 text-sm rounded-lg
                                  px-3.5 py-2.5">
                    ✓ {fMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={fCargando}
                  className={btnPrimary}
                >
                  {fCargando ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
              </form>

              {fInfo && (
                <div className="bg-gray-50 border border-gray-200
                                rounded-xl p-4 text-sm text-gray-600
                                leading-relaxed">
                  Contacta al{' '}
                  <span className="font-medium text-gray-900">
                    administrador del sistema
                  </span>{' '}
                  para restablecer tu contraseña. El admin puede asignarte
                  una nueva desde el panel de usuarios.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Pantalla principal login/registro ─────────── */}
        {pantalla === 'login' && (
          <div className="bg-white rounded-2xl border border-gray-200
                          overflow-hidden">

            {/* Header con logo */}
            <div className="px-7 pt-8 pb-2 text-center">
              <img
                src="/LogoRefaccionaria.png"
                alt="Refaccionaria El Chino y Taller Mecánico"
                className="h-28 mx-auto mb-2 object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <p className="text-xs text-gray-400 italic mt-1">
                "Expertos en Repuestos y Servicio Mecánico de Calidad"
              </p>
              <div className="border-t border-gray-100 mt-5 mb-1" />
              <p className="text-sm text-gray-500 mt-3">
                {tab === 'login'
                  ? 'Inicia sesión en el sistema'
                  : 'Registro controlado por el administrador'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mx-7 mt-4">
              {(['login','registro'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 pb-2.5 text-sm font-medium
                              transition-colors border-b-2 -mb-px
                    ${tab === t
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>

            <div className="p-7 pt-5">

              {/* ── Form Login ────────────────────────── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  {lError && (
                    <div className="bg-red-50 border border-red-200
                                    text-red-700 text-sm rounded-lg
                                    px-3.5 py-2.5">
                      {lError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium
                                      text-gray-600 uppercase tracking-wide">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={lEmail}
                      onChange={e => setLEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className={inputCls}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium
                                      text-gray-600 uppercase tracking-wide">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={lVerPass ? 'text' : 'password'}
                        value={lPass}
                        onChange={e => setLPass(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className={inputCls + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setLVerPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   text-gray-400 hover:text-gray-600 text-sm"
                      >
                        {lVerPass ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setPantalla('forgot')}
                      className="text-sm text-blue-600 hover:text-blue-700
                                 underline underline-offset-2"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={lCargando}
                    className={btnPrimary}
                  >
                    {lCargando ? 'Entrando...' : 'Entrar al sistema'}
                  </button>

                  <p className="text-center text-sm text-gray-500 pt-1">
                    ¿No tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setTab('registro')}
                      className="text-blue-600 hover:underline"
                    >
                      Crear cuenta
                    </button>
                  </p>
                </form>
              )}

              {/* ── Form Registro ─────────────────────── */}
              {tab === 'registro' && (
                <form onSubmit={handleRegistro} className="space-y-4">
                  {rError && (
                    <div className="bg-red-50 border border-red-200
                                    text-red-700 text-sm rounded-lg
                                    px-3.5 py-2.5">
                      {rError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium
                                      text-gray-600 uppercase tracking-wide">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={rNombre}
                      onChange={e => setRNombre(e.target.value)}
                      placeholder="Juan García López"
                      className={inputCls}
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium
                                        text-gray-600 uppercase tracking-wide">
                        Correo *
                      </label>
                      <input
                        type="email"
                        value={rEmail}
                        onChange={e => setREmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className={inputCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium
                                        text-gray-600 uppercase tracking-wide">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={rTel}
                        onChange={e => setRTel(e.target.value)}
                        placeholder="4431234567"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* Selector de rol */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium
                                      text-gray-600 uppercase tracking-wide">
                      Rol en el taller
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {rolesConfig.map(r => (
                        <button
                          key={r.valor}
                          type="button"
                          onClick={() => setRRol(r.valor)}
                          className={`py-2.5 rounded-lg text-xs font-medium
                                      border transition-colors text-center
                            ${rRol === r.valor
                              ? 'border-blue-300 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          <div className="text-base mb-0.5"
                               style={{ fontSize: '16px' }}>
                            {r.icono}
                          </div>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contraseña con medidor */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium
                                      text-gray-600 uppercase tracking-wide">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={rVerPass ? 'text' : 'password'}
                        value={rPass}
                        onChange={e => setRPass(e.target.value)}
                        placeholder="mínimo 6 caracteres"
                        autoComplete="new-password"
                        className={inputCls + ' pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setRVerPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   text-gray-400 hover:text-gray-600 text-sm"
                      >
                        {rVerPass ? '🙈' : '👁'}
                      </button>
                    </div>
                    {/* Barra de fortaleza */}
                    {rPass && (
                      <div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width:      fortaleza.pct + '%',
                              background: fortaleza.color
                            }}
                          />
                        </div>
                        <div className="text-xs mt-1"
                             style={{ color: fortaleza.color }}>
                          {fortaleza.label}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium
                                      text-gray-600 uppercase tracking-wide">
                      Confirmar contraseña *
                    </label>
                    <input
                      type="password"
                      value={rPass2}
                      onChange={e => setRPass2(e.target.value)}
                      placeholder="repetir contraseña"
                      autoComplete="new-password"
                      className={`${inputCls} ${
                        rPass2 && rPass !== rPass2
                          ? 'border-red-300 focus:ring-red-300'
                          : rPass2 && rPass === rPass2
                          ? 'border-green-300 focus:ring-green-300'
                          : ''
                      }`}
                    />
                    {rPass2 && rPass !== rPass2 && (
                      <p className="text-xs text-red-500">
                        Las contraseñas no coinciden
                      </p>
                    )}
                  </div>

                  {/* Aviso de que requiere admin */}
                  <div className="bg-amber-50 border border-amber-200
                                  rounded-lg px-3.5 py-2.5 text-xs
                                  text-amber-700 leading-relaxed">
                    El registro requiere autorización. Si no tienes un token
                    de administrador, tu solicitud será enviada para revisión.
                  </div>

                  <button
                    type="submit"
                    disabled={rCargando}
                    className={btnPrimary}
                  >
                    {rCargando ? 'Enviando...' : 'Solicitar acceso'}
                  </button>

                  <p className="text-center text-sm text-gray-500 pt-1">
                    ¿Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setTab('login')}
                      className="text-blue-600 hover:underline"
                    >
                      Iniciar sesión
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}