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
  if (v.length >= 6)           score++
  if (v.length >= 10)          score++
  if (/[A-Z]/.test(v))        score++
  if (/[0-9]/.test(v))        score++
  if (/[^A-Za-z0-9]/.test(v)) score++
  const niveles = [
    { pct: 0,   color: '#334155', label: 'Escribe una contraseña' },
    { pct: 20,  color: '#ef4444', label: 'Muy débil'  },
    { pct: 40,  color: '#f97316', label: 'Débil'      },
    { pct: 65,  color: '#eab308', label: 'Regular'    },
    { pct: 85,  color: '#22c55e', label: 'Buena'      },
    { pct: 100, color: '#10b981', label: 'Fuerte'     },
  ]
  return niveles[score]
}

/* ── Figura flotante decorativa ──────────────────────────────── */
function Shape({ className, style, children }: {
  className: string; style?: React.CSSProperties; children: React.ReactNode
}) {
  return (
    <div className={`absolute select-none pointer-events-none text-white/10 ${className}`}
         style={style}>
      {children}
    </div>
  )
}

export default function Login() {
  const [pantalla, setPantalla] = useState<Pantalla>('login')
  const [tab,      setTab]      = useState<'login'|'registro'>('login')

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
    if (rPass.length < 6) { setRError('La contraseña debe tener mínimo 6 caracteres'); return }
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
      setRError(
        err.response?.status === 401
          ? 'Solo el administrador puede crear cuentas.'
          : err.response?.data?.mensaje || 'Error al crear la cuenta'
      )
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
      setFError(err.response?.data?.mensaje || 'Error al procesar la solicitud')
    } finally { setFCargando(false) }
  }

  const inputCls = `w-full border border-white/10 rounded-lg px-3.5 py-2.5
                    text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                    bg-white/10 text-white placeholder-white/40 transition-all
                    focus:bg-white/15 focus:border-blue-400/50`

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)' }}>

      {/* ── Fondo animado ─────────────────────────────────────── */}
      {/* Círculos grandes */}
      <Shape className="animate-float-slow" style={{ top: '8%', left: '5%', fontSize: '140px' }}>⚙️</Shape>
      <Shape className="animate-float-mid"  style={{ top: '15%', right: '8%', fontSize: '100px' }}>🔧</Shape>
      <Shape className="animate-float-fast" style={{ bottom: '20%', left: '8%', fontSize: '90px' }}>🔩</Shape>
      <Shape className="animate-float-slow" style={{ bottom: '10%', right: '5%', fontSize: '120px', animationDelay: '2s' }}>⚙️</Shape>
      <Shape className="animate-float-mid"  style={{ top: '50%', left: '2%', fontSize: '70px', animationDelay: '1s' }}>🪛</Shape>
      <Shape className="animate-float-fast" style={{ top: '70%', right: '3%', fontSize: '80px', animationDelay: '3s' }}>🔧</Shape>

      {/* Círculos geométricos de fondo */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px]
                      rounded-full border border-blue-500/10 animate-spin-slow" />
      <div className="absolute top-[-60px] left-[-60px] w-[300px] h-[300px]
                      rounded-full border border-indigo-400/10"
           style={{ animation: 'spin-slow 25s linear infinite reverse' }} />
      <div className="absolute bottom-[-120px] right-[-120px] w-[450px] h-[450px]
                      rounded-full border border-purple-500/10 animate-spin-slow"
           style={{ animationDuration: '30s' }} />

      {/* Puntos decorativos */}
      {[...Array(12)].map((_, i) => (
        <div key={i}
          className="absolute w-1 h-1 rounded-full bg-blue-400/20 animate-pulse"
          style={{
            top:  `${10 + (i * 8) % 80}%`,
            left: `${5  + (i * 13) % 90}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        />
      ))}

      {/* ── Tarjeta principal ─────────────────────────────────── */}
      <div className="w-full max-w-md relative z-10">

        {/* Éxito */}
        {pantalla === 'exito' && (
          <div className="animate-slide-up bg-white/10 backdrop-blur-xl rounded-2xl
                          border border-white/20 p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-green-500/20 border border-green-400/40
                            rounded-xl flex items-center justify-center text-3xl mx-auto
                            animate-pulse-ring">✓</div>
            <h2 className="text-xl font-bold text-white">¡Cuenta creada!</h2>
            <p className="text-sm text-white/60">Ya puedes iniciar sesión con tus credenciales.</p>
            <button onClick={() => { setPantalla('login'); setTab('login') }}
              className="w-full py-2.5 rounded-lg text-sm font-medium
                         bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              Ir al login
            </button>
          </div>
        )}

        {/* Olvidé contraseña */}
        {pantalla === 'forgot' && (
          <div className="animate-slide-up bg-white/10 backdrop-blur-xl rounded-2xl
                          border border-white/20 overflow-hidden shadow-2xl">
            <div className="p-6 space-y-5">
              <button onClick={() => setPantalla('login')}
                className="flex items-center gap-1.5 text-sm text-white/50
                           hover:text-white/80 transition-colors">
                ← Volver al login
              </button>
              <div>
                <div className="w-11 h-11 bg-amber-500/20 border border-amber-400/30
                                rounded-xl flex items-center justify-center text-xl mb-4">🔑</div>
                <h2 className="text-lg font-bold text-white">Recuperar contraseña</h2>
                <p className="text-sm text-white/50 mt-1">
                  Ingresa tu correo y te indicaremos los pasos
                </p>
              </div>
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                    Correo electrónico
                  </label>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)}
                    placeholder="tu@correo.com" className={inputCls} />
                </div>
                {fError && <div className="bg-red-500/20 border border-red-400/30 text-red-300 text-sm rounded-lg px-3.5 py-2.5">{fError}</div>}
                {fMsg   && <div className="bg-green-500/20 border border-green-400/30 text-green-300 text-sm rounded-lg px-3.5 py-2.5">✓ {fMsg}</div>}
                <button type="submit" disabled={fCargando}
                  className="w-full py-2.5 rounded-lg text-sm font-medium btn-shimmer
                             text-white transition-all disabled:opacity-50">
                  {fCargando ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
              </form>
              {fInfo && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4
                                text-sm text-white/60 leading-relaxed">
                  Contacta al <span className="font-medium text-white">administrador</span> para restablecer tu contraseña desde el panel de usuarios.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Login / Registro */}
        {pantalla === 'login' && (
          <div className="animate-slide-up bg-white/10 backdrop-blur-xl rounded-2xl
                          border border-white/20 overflow-hidden shadow-2xl">

            {/* Header con logo */}
            <div className="px-7 pt-8 pb-2 text-center">
              <div className="relative inline-block mb-3">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl scale-110" />
                <img
                  src="/LogoRefaccionaria.png"
                  alt="Logo"
                  className="relative h-24 mx-auto object-contain drop-shadow-2xl
                             transition-transform duration-300 hover:scale-105"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <p className="text-xs text-white/30 italic mt-1">
                "Expertos en Repuestos y Servicio Mecánico de Calidad"
              </p>
              <div className="border-t border-white/10 mt-5 mb-1" />
              <p className="text-sm text-white/40 mt-3">
                {tab === 'login' ? 'Inicia sesión en el sistema' : 'Registro controlado por el administrador'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 mx-7 mt-4">
              {(['login','registro'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 pb-2.5 text-sm font-medium transition-all border-b-2 -mb-px
                    ${tab === t
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-white/30 hover:text-white/60'}`}>
                  {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>

            <div className="p-7 pt-5">

              {/* ── Form Login ─────────────────────────────── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                  {lError && (
                    <div className="bg-red-500/20 border border-red-400/30 text-red-300
                                    text-sm rounded-lg px-3.5 py-2.5 animate-fade-in">
                      {lError}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                      Correo electrónico
                    </label>
                    <input type="email" value={lEmail} onChange={e => setLEmail(e.target.value)}
                      placeholder="tu@correo.com" className={inputCls} autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input type={lVerPass ? 'text' : 'password'} value={lPass}
                        onChange={e => setLPass(e.target.value)}
                        placeholder="••••••••" autoComplete="current-password"
                        className={inputCls + ' pr-10'} />
                      <button type="button" onClick={() => setLVerPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   text-white/30 hover:text-white/70 text-sm transition-colors">
                        {lVerPass ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setPantalla('forgot')}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <button type="submit" disabled={lCargando}
                    className="w-full py-3 rounded-xl text-sm font-semibold btn-shimmer
                               text-white transition-all disabled:opacity-50
                               disabled:cursor-not-allowed shadow-lg shadow-blue-900/30
                               hover:shadow-blue-600/40 active:scale-[0.98]">
                    {lCargando
                      ? <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                           rounded-full animate-spin inline-block" />
                          Entrando...
                        </span>
                      : 'Entrar al sistema →'}
                  </button>
                  <p className="text-center text-sm text-white/40 pt-1">
                    ¿No tienes cuenta?{' '}
                    <button type="button" onClick={() => setTab('registro')}
                      className="text-blue-400 hover:text-blue-300 transition-colors">
                      Crear cuenta
                    </button>
                  </p>
                </form>
              )}

              {/* ── Form Registro ───────────────────────────── */}
              {tab === 'registro' && (
                <form onSubmit={handleRegistro} className="space-y-4 animate-fade-in">
                  {rError && (
                    <div className="bg-red-500/20 border border-red-400/30 text-red-300
                                    text-sm rounded-lg px-3.5 py-2.5">{rError}</div>
                  )}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                      Nombre completo *
                    </label>
                    <input type="text" value={rNombre} onChange={e => setRNombre(e.target.value)}
                      placeholder="Juan García López" className={inputCls} autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">Correo *</label>
                      <input type="email" value={rEmail} onChange={e => setREmail(e.target.value)}
                        placeholder="tu@correo.com" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">Teléfono</label>
                      <input type="tel" value={rTel} onChange={e => setRTel(e.target.value)}
                        placeholder="4431234567" className={inputCls} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                      Rol en el taller
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {rolesConfig.map(r => (
                        <button key={r.valor} type="button" onClick={() => setRRol(r.valor)}
                          className={`py-2.5 rounded-lg text-xs font-medium border transition-all text-center
                            ${rRol === r.valor
                              ? 'border-blue-400/60 bg-blue-500/20 text-blue-300 shadow-inner'
                              : 'border-white/10 text-white/40 hover:bg-white/5 hover:text-white/70'}`}>
                          <div className="text-base mb-0.5">{r.icono}</div>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <input type={rVerPass ? 'text' : 'password'} value={rPass}
                        onChange={e => setRPass(e.target.value)}
                        placeholder="mínimo 6 caracteres" autoComplete="new-password"
                        className={inputCls + ' pr-10'} />
                      <button type="button" onClick={() => setRVerPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   text-white/30 hover:text-white/70 text-sm transition-colors">
                        {rVerPass ? '🙈' : '👁'}
                      </button>
                    </div>
                    {rPass && (
                      <div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ width: fortaleza.pct + '%', background: fortaleza.color }} />
                        </div>
                        <div className="text-xs mt-1" style={{ color: fortaleza.color }}>
                          {fortaleza.label}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-white/50 uppercase tracking-wide">
                      Confirmar contraseña *
                    </label>
                    <input type="password" value={rPass2} onChange={e => setRPass2(e.target.value)}
                      placeholder="repetir contraseña" autoComplete="new-password"
                      className={`${inputCls} ${
                        rPass2 && rPass !== rPass2 ? 'border-red-400/50'
                        : rPass2 && rPass === rPass2 ? 'border-green-400/50' : ''
                      }`} />
                    {rPass2 && rPass !== rPass2 && (
                      <p className="text-xs text-red-400">Las contraseñas no coinciden</p>
                    )}
                  </div>
                  <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg
                                  px-3.5 py-2.5 text-xs text-amber-300/80 leading-relaxed">
                    El registro requiere autorización del administrador.
                  </div>
                  <button type="submit" disabled={rCargando}
                    className="w-full py-3 rounded-xl text-sm font-semibold btn-shimmer
                               text-white transition-all disabled:opacity-50
                               disabled:cursor-not-allowed shadow-lg active:scale-[0.98]">
                    {rCargando ? 'Enviando...' : 'Solicitar acceso'}
                  </button>
                  <p className="text-center text-sm text-white/40 pt-1">
                    ¿Ya tienes cuenta?{' '}
                    <button type="button" onClick={() => setTab('login')}
                      className="text-blue-400 hover:text-blue-300 transition-colors">
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
