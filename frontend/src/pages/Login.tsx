import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginService } from '../services/auth.service'
import api from '../services/api'

type Pantalla = 'login' | 'registro' | 'forgot' | 'exito'
type Rol      = 'RECEPCIONISTA' | 'MECANICO' | 'ADMIN'
type Tema     = 'dark' | 'light'

const rolesConfig = [
  { valor: 'RECEPCIONISTA' as Rol, label: 'Recepcionista', icono: '📋' },
  { valor: 'MECANICO'      as Rol, label: 'Mecánico',      icono: '🔧' },
  { valor: 'ADMIN'         as Rol, label: 'Admin',         icono: '⚙️' },
]

const pwdFortaleza = (v: string) => {
  let score = 0
  if (v.length >= 6)           score++
  if (v.length >= 10)          score++
  if (/[A-Z]/.test(v))        score++
  if (/[0-9]/.test(v))        score++
  if (/[^A-Za-z0-9]/.test(v)) score++
  const niveles = [
    { pct: 0,   color: '#64748b', label: 'Escribe una contraseña' },
    { pct: 20,  color: '#ef4444', label: 'Muy débil'  },
    { pct: 40,  color: '#f97316', label: 'Débil'      },
    { pct: 65,  color: '#eab308', label: 'Regular'    },
    { pct: 85,  color: '#22c55e', label: 'Buena'      },
    { pct: 100, color: '#10b981', label: 'Fuerte'     },
  ]
  return niveles[score]
}

/* ── Carro SVG animado ───────────────────────────────────────── */
function CarroAnimado({ tema }: { tema: Tema }) {
  const body    = tema === 'dark' ? '#3b82f6' : '#2563eb'
  const roof    = tema === 'dark' ? '#1d4ed8' : '#1e40af'
  const glass   = tema === 'dark' ? '#bfdbfe' : '#dbeafe'
  const road    = tema === 'dark' ? '#1e293b' : '#e2e8f0'
  const stripe  = tema === 'dark' ? '#334155' : '#cbd5e1'
  const exhaust = tema === 'dark' ? '#94a3b8' : '#94a3b8'

  return (
    <div className="w-full flex flex-col items-center gap-0 select-none">
      {/* Escena */}
      <div className="relative w-72 h-28">

        {/* Nubes */}
        <div className="absolute top-1 left-2 opacity-30"
             style={{ animation: 'cloud-move 8s linear infinite' }}>
          <div className="relative">
            <div className="w-10 h-4 rounded-full"
                 style={{ background: tema === 'dark' ? '#94a3b8' : '#94a3b8' }} />
            <div className="absolute -top-2 left-2 w-6 h-5 rounded-full"
                 style={{ background: tema === 'dark' ? '#94a3b8' : '#94a3b8' }} />
            <div className="absolute -top-1 left-5 w-5 h-4 rounded-full"
                 style={{ background: tema === 'dark' ? '#94a3b8' : '#94a3b8' }} />
          </div>
        </div>
        <div className="absolute top-3 right-8 opacity-20"
             style={{ animation: 'cloud-move 12s linear infinite', animationDelay: '-4s' }}>
          <div className="relative">
            <div className="w-8 h-3 rounded-full"
                 style={{ background: tema === 'dark' ? '#94a3b8' : '#94a3b8' }} />
            <div className="absolute -top-1.5 left-1 w-5 h-4 rounded-full"
                 style={{ background: tema === 'dark' ? '#94a3b8' : '#94a3b8' }} />
          </div>
        </div>

        {/* Carro SVG */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2"
             style={{ animation: 'car-bounce 0.5s ease-in-out infinite alternate' }}>
          <svg width="160" height="72" viewBox="0 0 160 72" fill="none">
            {/* Sombra */}
            <ellipse cx="80" cy="70" rx="58" ry="4" fill="black" opacity="0.15" />

            {/* Cuerpo principal */}
            <rect x="12" y="38" width="136" height="26" rx="8" fill={body} />

            {/* Techo / cabina */}
            <path d="M42 38 L52 14 L108 14 L118 38 Z" fill={roof} />

            {/* Parabrisas delantero */}
            <path d="M98 16 L113 36 L88 36 Z" fill={glass} opacity="0.85" />
            {/* Ventana trasera */}
            <path d="M62 16 L47 36 L72 36 Z" fill={glass} opacity="0.85" />
            {/* Ventana central */}
            <rect x="74" y="16" width="12" height="20" rx="2" fill={glass} opacity="0.7" />

            {/* Faros delanteros */}
            <ellipse cx="142" cy="48" rx="8" ry="5" fill="#fef08a" opacity="0.9" />
            <ellipse cx="142" cy="48" rx="5" ry="3" fill="white" opacity="0.8" />

            {/* Calaveras traseras */}
            <ellipse cx="18" cy="48" rx="7" ry="4" fill="#fca5a5" opacity="0.8" />

            {/* Detalle línea lateral */}
            <line x1="20" y1="51" x2="140" y2="51" stroke="white" strokeWidth="1" opacity="0.2" />

            {/* Rueda trasera */}
            <circle cx="42" cy="60" r="12" fill="#1e293b" />
            <circle cx="42" cy="60" r="9"  fill="#334155" />
            <circle cx="42" cy="60" r="4"  fill="#64748b" />
            {/* Rayos rueda trasera */}
            <g style={{ transformOrigin: '42px 60px', animation: 'wheel-spin 0.6s linear infinite' }}>
              <line x1="42" y1="51" x2="42" y2="55" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="42" y1="65" x2="42" y2="69" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="33" y1="60" x2="37" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="47" y1="60" x2="51" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="36" y1="53" x2="39" y2="56" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="45" y1="64" x2="48" y2="67" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="36" y1="67" x2="39" y2="64" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="45" y1="56" x2="48" y2="53" stroke="#94a3b8" strokeWidth="1.5" />
            </g>

            {/* Rueda delantera */}
            <circle cx="118" cy="60" r="12" fill="#1e293b" />
            <circle cx="118" cy="60" r="9"  fill="#334155" />
            <circle cx="118" cy="60" r="4"  fill="#64748b" />
            {/* Rayos rueda delantera */}
            <g style={{ transformOrigin: '118px 60px', animation: 'wheel-spin 0.6s linear infinite' }}>
              <line x1="118" y1="51" x2="118" y2="55" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="118" y1="65" x2="118" y2="69" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="109" y1="60" x2="113" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="123" y1="60" x2="127" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="112" y1="53" x2="115" y2="56" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="121" y1="64" x2="124" y2="67" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="112" y1="67" x2="115" y2="64" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="121" y1="56" x2="124" y2="53" stroke="#94a3b8" strokeWidth="1.5" />
            </g>

            {/* Escape de humo */}
            <circle cx="8" cy="54" r="3" fill={exhaust} opacity="0.5"
                    style={{ animation: 'puff1 1.2s ease-out infinite' }} />
            <circle cx="3" cy="50" r="4" fill={exhaust} opacity="0.3"
                    style={{ animation: 'puff2 1.2s ease-out infinite', animationDelay: '0.3s' }} />
          </svg>
        </div>

        {/* Carretera */}
        <div className="absolute bottom-0 left-0 right-0 h-6 rounded-full overflow-hidden"
             style={{ background: road }}>
          {/* Líneas de la carretera */}
          <div className="absolute top-2.5 left-0 right-0 h-1 flex gap-6 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="shrink-0 w-10 h-full rounded-full"
                   style={{
                     background: stripe,
                     animation: 'road-move 0.6s linear infinite',
                     animationDelay: `${i * -0.075}s`
                   }} />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs mt-1 font-medium"
         style={{ color: tema === 'dark' ? '#64748b' : '#94a3b8' }}>
        Servicio mecánico profesional
      </p>
    </div>
  )
}

export default function Login() {
  const [pantalla, setPantalla] = useState<Pantalla>('login')
  const [tab,      setTab]      = useState<'login'|'registro'>('login')
  const [tema,     setTema]     = useState<Tema>('dark')

  const dark = tema === 'dark'

  // Login
  const [lEmail,    setLEmail]    = useState('')
  const [lPass,     setLPass]     = useState('')
  const [lVerPass,  setLVerPass]  = useState(false)
  const [lError,    setLError]    = useState('')
  const [lCargando, setLCargando] = useState(false)

  // Registro
  const [rNombre,   setRNombre]   = useState('')
  const [rEmail,    setREmail]    = useState('')
  const [rTel,      setRTel]      = useState('')
  const [rRol,      setRRol]      = useState<Rol>('RECEPCIONISTA')
  const [rPass,     setRPass]     = useState('')
  const [rPass2,    setRPass2]    = useState('')
  const [rVerPass,  setRVerPass]  = useState(false)
  const [rError,    setRError]    = useState('')
  const [rCargando, setRCargando] = useState(false)

  // Forgot
  const [fEmail,    setFEmail]    = useState('')
  const [fMsg,      setFMsg]      = useState('')
  const [fError,    setFError]    = useState('')
  const [fInfo,     setFInfo]     = useState(false)
  const [fCargando, setFCargando] = useState(false)

  const { login } = useAuth()
  const navigate  = useNavigate()
  const fortaleza = pwdFortaleza(rPass)

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
    } finally { setLCargando(false) }
  }

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setRError('')
    if (!rNombre || !rEmail || !rPass) { setRError('Completa los campos obligatorios'); return }
    if (rPass.length < 6) { setRError('Mínimo 6 caracteres'); return }
    if (rPass !== rPass2) { setRError('Las contraseñas no coinciden'); return }
    setRCargando(true)
    try {
      const token = localStorage.getItem('token')
      await api.post('/auth/registro', {
        nombre: rNombre, email: rEmail,
        telefono: rTel || undefined, password: rPass, rol: rRol
      }, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      setPantalla('exito')
    } catch (err: any) {
      setRError(err.response?.status === 401
        ? 'Solo el administrador puede crear cuentas.'
        : err.response?.data?.mensaje || 'Error al crear la cuenta')
    } finally { setRCargando(false) }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setFError(''); setFMsg('')
    if (!fEmail) { setFError('Ingresa tu correo'); return }
    setFCargando(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: fEmail })
      setFMsg(data.mensaje); setFInfo(true)
    } catch (err: any) {
      setFError(err.response?.data?.mensaje || 'Error al procesar')
    } finally { setFCargando(false) }
  }

  // ── Estilos dinámicos por tema ─────────────────────────────
  const bg        = dark ? '#0f172a' : '#f8fafc'
  const cardBg    = dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.95)'
  const cardBorder= dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
  const textMain  = dark ? '#f1f5f9' : '#0f172a'
  const textSub   = dark ? '#94a3b8' : '#64748b'
  const textLabel = dark ? '#64748b' : '#94a3b8'
  const inputBg   = dark ? 'rgba(255,255,255,0.08)' : '#ffffff'
  const inputBorder= dark ? 'rgba(255,255,255,0.12)' : '#d1d5db'
  const inputText = dark ? '#f1f5f9' : '#111827'
  const inputPlaceholder = dark ? '#475569' : '#9ca3af'
  const tabActive = dark ? '#f1f5f9' : '#0f172a'
  const tabInactive = dark ? '#475569' : '#9ca3af'
  const tabBorder = dark ? '#f1f5f9' : '#0f172a'
  const divider   = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
  const btnBg     = dark ? '#1e40af' : '#1e40af'
  const errorBg   = dark ? 'rgba(239,68,68,0.15)' : '#fef2f2'
  const errorBorder = dark ? 'rgba(239,68,68,0.3)' : '#fecaca'
  const errorText = dark ? '#fca5a5' : '#dc2626'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    borderRadius: '0.5rem',
    padding: '0.625rem 0.875rem',
    fontSize: '0.875rem',
    color: inputText,
    outline: 'none',
    transition: 'all 0.2s',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500"
         style={{ background: bg }}>

      {/* ── Toggle tema ───────────────────────────────────────── */}
      <button
        onClick={() => setTema(t => t === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full
                   flex items-center justify-center text-lg shadow-lg
                   transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'}`,
          color: dark ? '#f1f5f9' : '#0f172a',
        }}
        title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-md animate-slide-up">

        {/* ── Pantalla éxito ─────────────────────────────────── */}
        {pantalla === 'exito' && (
          <div className="rounded-2xl p-8 text-center space-y-4 shadow-2xl"
               style={{ background: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(16px)' }}>
            <div className="w-16 h-16 bg-green-500/20 border border-green-400/40 rounded-xl
                            flex items-center justify-center text-3xl mx-auto">✓</div>
            <h2 className="text-xl font-bold" style={{ color: textMain }}>¡Cuenta creada!</h2>
            <p className="text-sm" style={{ color: textSub }}>Ya puedes iniciar sesión.</p>
            <button onClick={() => { setPantalla('login'); setTab('login') }}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: btnBg }}>
              Ir al login
            </button>
          </div>
        )}

        {/* ── Olvidé contraseña ─────────────────────────────── */}
        {pantalla === 'forgot' && (
          <div className="rounded-2xl overflow-hidden shadow-2xl"
               style={{ background: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(16px)' }}>
            <div className="p-6 space-y-5">
              <button onClick={() => setPantalla('login')}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: textSub }}>
                ← Volver al login
              </button>
              <div>
                <div className="w-11 h-11 bg-amber-500/20 border border-amber-400/30
                                rounded-xl flex items-center justify-center text-xl mb-4">🔑</div>
                <h2 className="text-lg font-bold" style={{ color: textMain }}>Recuperar contraseña</h2>
                <p className="text-sm mt-1" style={{ color: textSub }}>
                  Ingresa tu correo y te indicaremos los pasos
                </p>
              </div>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                         style={{ color: textLabel }}>Correo electrónico</label>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)}
                    placeholder="tu@correo.com" style={inputStyle} />
                </div>
                {fError && <div className="text-sm rounded-lg px-3.5 py-2.5"
                  style={{ background: errorBg, border: `1px solid ${errorBorder}`, color: errorText }}>{fError}</div>}
                {fMsg   && <div className="text-sm rounded-lg px-3.5 py-2.5 bg-green-500/10 border border-green-400/20 text-green-400">✓ {fMsg}</div>}
                <button type="submit" disabled={fCargando}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white
                             transition-all disabled:opacity-50"
                  style={{ background: btnBg }}>
                  {fCargando ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
              </form>
              {fInfo && (
                <div className="rounded-xl p-4 text-sm leading-relaxed"
                     style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                              border: `1px solid ${divider}`, color: textSub }}>
                  Contacta al <span className="font-medium" style={{ color: textMain }}>administrador</span> para restablecer tu contraseña.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Login / Registro ──────────────────────────────── */}
        {pantalla === 'login' && (
          <div className="rounded-2xl overflow-hidden shadow-2xl transition-all duration-500"
               style={{ background: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(20px)' }}>

            {/* Header */}
            <div className="px-7 pt-7 pb-2 text-center">
              {/* Logo */}
              <div className="mb-3">
                <img src="/LogoRefaccionaria.png" alt="Logo"
                  className="h-20 mx-auto object-contain transition-transform duration-300 hover:scale-105"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>

              {/* Carro animado */}
              <CarroAnimado tema={tema} />

              <div className="border-t mt-4 mb-1" style={{ borderColor: divider }} />
              <p className="text-sm mt-3" style={{ color: textSub }}>
                {tab === 'login' ? 'Inicia sesión en el sistema' : 'Registro controlado por el administrador'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex mx-7 mt-4" style={{ borderBottom: `1px solid ${divider}` }}>
              {(['login','registro'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 pb-2.5 text-sm font-medium transition-all border-b-2 -mb-px"
                  style={{
                    borderBottomColor: tab === t ? tabBorder : 'transparent',
                    color: tab === t ? tabActive : tabInactive,
                  }}>
                  {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>

            <div className="p-7 pt-5">

              {/* ── Form Login ─────────────────────────────── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                  {lError && (
                    <div className="text-sm rounded-lg px-3.5 py-2.5"
                         style={{ background: errorBg, border: `1px solid ${errorBorder}`, color: errorText }}>
                      {lError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                           style={{ color: textLabel }}>Correo electrónico</label>
                    <input type="email" value={lEmail} onChange={e => setLEmail(e.target.value)}
                      placeholder="tu@correo.com" style={inputStyle} autoFocus
                      onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                      onBlur={e  => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                           style={{ color: textLabel }}>Contraseña</label>
                    <div className="relative">
                      <input type={lVerPass ? 'text' : 'password'} value={lPass}
                        onChange={e => setLPass(e.target.value)}
                        placeholder="••••••••" autoComplete="current-password"
                        style={{ ...inputStyle, paddingRight: '2.5rem' }}
                        onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                        onBlur={e  => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none' }} />
                      <button type="button" onClick={() => setLVerPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors"
                        style={{ color: textSub }}>
                        {lVerPass ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setPantalla('forgot')}
                      className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <button type="submit" disabled={lCargando}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white
                               transition-all disabled:opacity-50 shadow-lg
                               active:scale-[0.98] hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                    {lCargando
                      ? <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                           rounded-full animate-spin inline-block" />
                          Entrando...
                        </span>
                      : 'Entrar al sistema →'}
                  </button>
                  <p className="text-center text-sm pt-1" style={{ color: textSub }}>
                    ¿No tienes cuenta?{' '}
                    <button type="button" onClick={() => setTab('registro')}
                      className="text-blue-500 hover:text-blue-400 transition-colors">
                      Crear cuenta
                    </button>
                  </p>
                </form>
              )}

              {/* ── Form Registro ───────────────────────────── */}
              {tab === 'registro' && (
                <form onSubmit={handleRegistro} className="space-y-4 animate-fade-in">
                  {rError && (
                    <div className="text-sm rounded-lg px-3.5 py-2.5"
                         style={{ background: errorBg, border: `1px solid ${errorBorder}`, color: errorText }}>
                      {rError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                           style={{ color: textLabel }}>Nombre completo *</label>
                    <input type="text" value={rNombre} onChange={e => setRNombre(e.target.value)}
                      placeholder="Juan García López" style={inputStyle} autoFocus
                      onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                      onBlur={e  => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                             style={{ color: textLabel }}>Correo *</label>
                      <input type="email" value={rEmail} onChange={e => setREmail(e.target.value)}
                        placeholder="tu@correo.com" style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                        onBlur={e  => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                             style={{ color: textLabel }}>Teléfono</label>
                      <input type="tel" value={rTel} onChange={e => setRTel(e.target.value)}
                        placeholder="4431234567" style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                        onBlur={e  => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                           style={{ color: textLabel }}>Rol en el taller</label>
                    <div className="grid grid-cols-3 gap-2">
                      {rolesConfig.map(r => (
                        <button key={r.valor} type="button" onClick={() => setRRol(r.valor)}
                          className="py-2.5 rounded-lg text-xs font-medium border transition-all text-center"
                          style={{
                            borderColor: rRol === r.valor ? '#3b82f6' : inputBorder,
                            background:  rRol === r.valor ? 'rgba(59,130,246,0.15)' : 'transparent',
                            color:       rRol === r.valor ? '#3b82f6' : textSub,
                          }}>
                          <div className="text-base mb-0.5">{r.icono}</div>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                           style={{ color: textLabel }}>Contraseña *</label>
                    <div className="relative">
                      <input type={rVerPass ? 'text' : 'password'} value={rPass}
                        onChange={e => setRPass(e.target.value)}
                        placeholder="mínimo 6 caracteres" autoComplete="new-password"
                        style={{ ...inputStyle, paddingRight: '2.5rem' }}
                        onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                        onBlur={e  => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = 'none' }} />
                      <button type="button" onClick={() => setRVerPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: textSub }}>
                        {rVerPass ? '🙈' : '👁'}
                      </button>
                    </div>
                    {rPass && (
                      <div className="mt-1.5">
                        <div className="h-1 rounded-full overflow-hidden"
                             style={{ background: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ width: fortaleza.pct + '%', background: fortaleza.color }} />
                        </div>
                        <div className="text-xs mt-1" style={{ color: fortaleza.color }}>{fortaleza.label}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide mb-1.5"
                           style={{ color: textLabel }}>Confirmar contraseña *</label>
                    <input type="password" value={rPass2} onChange={e => setRPass2(e.target.value)}
                      placeholder="repetir contraseña" autoComplete="new-password"
                      style={{
                        ...inputStyle,
                        borderColor: rPass2 && rPass !== rPass2 ? '#ef4444'
                                   : rPass2 && rPass === rPass2 ? '#22c55e'
                                   : inputBorder
                      }}
                      onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                      onBlur={e  => { e.target.style.boxShadow = 'none' }} />
                    {rPass2 && rPass !== rPass2 && (
                      <p className="text-xs mt-1 text-red-400">Las contraseñas no coinciden</p>
                    )}
                  </div>
                  <div className="rounded-lg px-3.5 py-2.5 text-xs leading-relaxed"
                       style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#fbbf24' }}>
                    El registro requiere autorización del administrador.
                  </div>
                  <button type="submit" disabled={rCargando}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white
                               transition-all disabled:opacity-50 active:scale-[0.98]
                               hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                    {rCargando ? 'Enviando...' : 'Solicitar acceso'}
                  </button>
                  <p className="text-center text-sm pt-1" style={{ color: textSub }}>
                    ¿Ya tienes cuenta?{' '}
                    <button type="button" onClick={() => setTab('login')}
                      className="text-blue-500 hover:text-blue-400 transition-colors">
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
