import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── número de WhatsApp para contacto (configurable) ────────── */
const WA_NUMERO  = '4436123733'          
const WA_MENSAJE = encodeURIComponent(
  '¡Hola! Me interesa el sistema de taller. ¿Me puedes dar más información?'
)
const WA_URL = `https://wa.me/${WA_NUMERO}?text=${WA_MENSAJE}`

/* ─── credenciales del demo público ─────────────────────────── */
const DEMO_EMAIL = 'demo@tallerpro.mx'
const DEMO_PASS  = 'Demo1234'

/* ─── planes de precio ───────────────────────────────────────── */
const PLANES = [
  {
    nombre:   'Mensual',
    precio:   '$ 799',
    periodo:  '/ mes',
    ahorro:   null,
    color:    'border-gray-200',
    badge:    null,
    incluye: [
      'Todos los módulos incluidos',
      'Usuarios ilimitados',
      'Soporte por WhatsApp',
      'Actualizaciones incluidas',
      'Configuración en 1 día',
    ],
    cta: 'Empezar ahora',
    ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  {
    nombre:   'Anual',
    precio:   '$ 649',
    periodo:  '/ mes',
    ahorro:   'Ahorras $1,800 al año',
    color:    'border-blue-500 ring-2 ring-blue-500',
    badge:    'MÁS POPULAR',
    incluye: [
      'Todo lo del plan Mensual',
      'Capacitación de 1 hora incluida',
      'Soporte prioritario',
      'Copia de seguridad diaria',
      'Dominio personalizado gratis',
    ],
    cta: 'Elegir plan anual',
    ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  {
    nombre:   'Para siempre',
    precio:   '$ 9,500',
    periodo:  'pago único',
    ahorro:   '+ $299/mes soporte',
    color:    'border-gray-200',
    badge:    null,
    incluye: [
      'Licencia vitalicia',
      'Instalación y configuración',
      'Capacitación presencial',
      'Código fuente incluido',
      'Personalización de logo/colores',
    ],
    cta: 'Cotizar instalación',
    ctaStyle: 'bg-gray-900 hover:bg-gray-700 text-white',
  },
]

/* ─── datos de features ──────────────────────────────────────── */
const FEATURES = [
  {
    icono: '📋',
    titulo: 'Órdenes de trabajo digitales',
    desc: 'Crea, asigna y sigue el estado de cada servicio en tiempo real. Sin papel, sin caos.',
  },
  {
    icono: '💰',
    titulo: 'Cobros, anticipos y deudas',
    desc: 'Registra abonos, anticipos y controla quién te debe. Todo en un solo lugar.',
  },
  {
    icono: '📱',
    titulo: 'WhatsApp automático',
    desc: 'Cuando el carro está listo, el sistema manda el aviso al cliente automáticamente.',
  },
  {
    icono: '📦',
    titulo: 'Inventario inteligente',
    desc: 'Controla refacciones, alertas de stock bajo y ventas de mostrador o taller.',
  },
  {
    icono: '🔧',
    titulo: 'App para mecánicos',
    desc: 'Vista optimizada para celular. El mecánico ve sus órdenes y actualiza el estado sin necesitar computadora.',
  },
  {
    icono: '📄',
    titulo: 'PDFs profesionales',
    desc: 'Genera órdenes de trabajo y cotizaciones con el logo de tu negocio listas para imprimir o enviar.',
  },
  {
    icono: '🤖',
    titulo: 'Asistente IA de diagnóstico',
    desc: 'El mecánico pregunta, la IA responde con posibles causas y soluciones basadas en el historial del auto.',
  },
  {
    icono: '📊',
    titulo: 'Dashboard con métricas',
    desc: 'Ingresos del mes, mecánico más productivo, autos en taller y stock bajo — todo en una pantalla.',
  },
]

const PASOS = [
  {
    num: '01',
    titulo: 'Te damos tu sistema listo',
    desc: 'Configuramos todo con el nombre y logo de tu taller. Sin instalar nada — funciona desde el celular o la computadora.',
  },
  {
    num: '02',
    titulo: 'Empiezas a usarlo el mismo día',
    desc: 'Creamos tus usuarios (recepcionista, mecánicos) y te explicamos lo básico en 30 minutos.',
  },
  {
    num: '03',
    titulo: 'Tu negocio funciona más organizado',
    desc: 'Controla todo desde una pantalla: órdenes, pagos, inventario, clientes y reportes.',
  },
]

const MODULOS = [
  { icono: '🗂️',  label: 'Órdenes de trabajo'   },
  { icono: '👥',  label: 'Clientes y vehículos'  },
  { icono: '🔩',  label: 'Inventario'             },
  { icono: '💳',  label: 'Pagos y cuentas'        },
  { icono: '📝',  label: 'Cotizaciones'           },
  { icono: '📊',  label: 'Reportes mensuales'     },
  { icono: '🔧',  label: 'App para mecánicos'     },
  { icono: '🚗',  label: 'Historial del vehículo' },
  { icono: '🤖',  label: 'IA de diagnóstico'      },
  { icono: '📱',  label: 'WhatsApp automático'    },
  { icono: '📄',  label: 'PDFs con tu logo'       },
  { icono: '🏆',  label: 'Ranking de mecánicos'   },
]

/* ─── componente contador animado ────────────────────────────── */
function Contador({ hasta, sufijo = '' }: { hasta: number; sufijo?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let inicio: number
    const dur = 1400
    const step = (ts: number) => {
      if (!inicio) inicio = ts
      const prog = Math.min((ts - inicio) / dur, 1)
      setVal(Math.floor(prog * hasta))
      if (prog < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [hasta])
  return <>{val.toLocaleString('es-MX')}{sufijo}</>
}

/* ─── landing page ───────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">

      {/* ── Barra de navegación ─────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">
              T
            </div>
            <span className="font-black text-gray-900 text-lg">TallerPro</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600 font-medium">
            <a href="#funciones"  className="hover:text-blue-600 transition-colors">Funciones</a>
            <a href="#como"       className="hover:text-blue-600 transition-colors">Cómo funciona</a>
            <a href="#modulos"    className="hover:text-blue-600 transition-colors">Módulos</a>
            <a href="#precios"    className="hover:text-blue-600 transition-colors">Precios</a>
            <a href="#contacto"   className="hover:text-blue-600 transition-colors">Contacto</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Entrar
            </button>
            <a
              href={WA_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl transition-colors shadow-sm"
            >
              Solicitar demo
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="pt-28 pb-24 bg-linear-to-br from-gray-950 via-blue-950 to-gray-900 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-800/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-linear-to-r from-transparent via-blue-500/20 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Sistema en la nube — sin instalaciones
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6">
            Tu taller, más organizado{' '}
            <span className="text-transparent bg-clip-text bg-linear -to-r from-blue-400 to-cyan-400">
              desde el día uno
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sistema de gestión para talleres mecánicos y refaccionarias. Controla órdenes, cobros, inventario y mecánicos — todo desde tu celular o computadora.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WA_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-green-900/30 hover:scale-105"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.103 1.504 5.818L.057 23.885a.5.5 0 00.659.61l6.249-1.99A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.504-5.173-1.378l-.361-.212-3.743 1.19 1.257-3.631-.229-.373A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Quiero mi taller digital
            </a>
            <button
              onClick={() => navigate('/login?demo=1')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-7 py-4 rounded-2xl border border-white/20 hover:border-white/40 transition-all text-lg"
            >
              🖥️ Probar demo gratis →
            </button>
          </div>

          {/* Credenciales demo visibles */}
          <div className="mt-6 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm text-gray-300">
            <span className="text-gray-400">Demo:</span>
            <code className="text-blue-300 font-mono">{DEMO_EMAIL}</code>
            <span className="text-gray-600">|</span>
            <code className="text-blue-300 font-mono">{DEMO_PASS}</code>
          </div>

          {/* Números */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
            {[
              { hasta: 100, sufijo: '%', label: 'En la nube' },
              { hasta: 12,  sufijo: '+', label: 'Módulos incluidos' },
              { hasta: 1,   sufijo: ' día', label: 'Para arrancar' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-black text-white">
                  <Contador hasta={s.hasta} sufijo={s.sufijo} />
                </div>
                <div className="text-sm text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="funciones" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Funciones</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2 mb-4">
              Todo lo que necesita tu taller
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Diseñado específicamente para talleres mecánicos mexicanos. Sin funciones de más, sin complicaciones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className="text-4xl mb-4">{f.icono}</div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{f.titulo}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────── */}
      <section id="como" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Proceso</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2 mb-4">
              Arrancas en 3 pasos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Línea conectora */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-linear-to-r from-blue-200 via-blue-400 to-blue-200" />

            {PASOS.map((p, i) => (
              <div key={i} className="text-center relative">
                <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-black text-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200 relative z-10">
                  {p.num}
                </div>
                <h3 className="font-black text-gray-900 text-lg mb-3">{p.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Banner intermedio ────────────────────────────────── */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-white">
              ¿Cansado de los cuadernos y las hojas sueltas?
            </h3>
            <p className="text-blue-100 mt-1">
              Digitaliza tu taller hoy. Nosotros nos encargamos de todo.
            </p>
          </div>
          <a
            href={WA_URL}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-4 rounded-2xl transition-colors shadow-lg text-sm whitespace-nowrap"
          >
            📱 Hablar por WhatsApp
          </a>
        </div>
      </section>

      {/* ── Módulos incluidos ────────────────────────────────── */}
      <section id="modulos" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Todo incluido</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2 mb-4">
              12 módulos en un solo sistema
            </h2>
            <p className="text-gray-500 text-lg">Sin costos extra por módulo. Todo viene incluido desde el primer día.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {MODULOS.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
              >
                <span className="text-xl">{m.icono}</span>
                <span className="text-sm font-medium text-gray-700">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bloque de confianza ──────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-linear-to-br from-gray-900 to-blue-950 rounded-3xl p-10 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-blue-600/20 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-5xl mb-6">🔧</div>
              <h3 className="text-3xl font-black mb-4">
                Hecho para talleres mexicanos
              </h3>
              <p className="text-gray-300 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                No es un sistema genérico. Fue construido conociendo la realidad del taller: el mecánico que no tiene computadora, el dueño que quiere saber cuánto entró, el cliente que llama a preguntar si ya está listo su carro.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-xl shadow-green-900/30"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.103 1.504 5.818L.057 23.885a.5.5 0 00.659.61l6.249-1.99A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.504-5.173-1.378l-.361-.212-3.743 1.19 1.257-3.631-.229-.373A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  Quiero saber el precio
                </a>
                <button
                  onClick={() => navigate('/login')}
                  className="text-white/70 hover:text-white font-medium px-6 py-4 border border-white/10 hover:border-white/30 rounded-2xl transition-colors"
                >
                  Ver el sistema en vivo →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Precios ──────────────────────────────────────────── */}
      <section id="precios" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Precios</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2 mb-4">
              Sin letra chica. Sin sorpresas.
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              Elige el plan que mejor se adapta a tu taller. Puedes cambiar cuando quieras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANES.map((plan, i) => (
              <div
                key={i}
                className={`relative bg-white rounded-3xl border-2 p-8 ${plan.color} transition-all hover:-translate-y-1 hover:shadow-xl`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-black px-4 py-1.5 rounded-full tracking-wider">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-gray-500 text-sm font-semibold mb-2">{plan.nombre}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-gray-900">{plan.precio}</span>
                    <span className="text-gray-400 text-sm mb-1">{plan.periodo}</span>
                  </div>
                  {plan.ahorro && (
                    <p className="text-green-600 text-sm font-semibold mt-1">{plan.ahorro}</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.incluye.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={`block text-center font-bold py-3 rounded-xl transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            ¿No sabes cuál elegir? <a href={WA_URL} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Escríbenos y te asesoramos sin compromiso</a>
          </p>
        </div>
      </section>

      {/* ── Contacto ─────────────────────────────────────────── */}
      <section id="contacto" className="py-20 bg-gray-50">
        <div className="max-w-lg mx-auto px-6 text-center">
          <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Contacto</span>
          <h2 className="text-3xl font-black text-gray-900 mt-2 mb-4">
            ¿Tienes dudas? Escríbenos
          </h2>
          <p className="text-gray-500 mb-8">
            Respondemos por WhatsApp. Cuéntanos cuántos mecánicos tienes y cómo funciona tu taller — te armamos una propuesta.
          </p>
          <a
            href={WA_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-xl shadow-green-200 hover:scale-105"
          >
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.103 1.504 5.818L.057 23.885a.5.5 0 00.659.61l6.249-1.99A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.504-5.173-1.378l-.361-.212-3.743 1.19 1.257-3.631-.229-.373A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Escribir por WhatsApp
          </a>
          <p className="text-xs text-gray-400 mt-4">
            Generalmente respondemos en menos de una hora
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black">
              T
            </div>
            <span className="text-white font-bold">TallerPro</span>
            <span className="text-gray-600 text-sm">Sistema de gestión para talleres mecánicos</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <button
              onClick={() => navigate('/login')}
              className="hover:text-white transition-colors"
            >
              Iniciar sesión
            </button>
            <a
              href={WA_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <div className="text-center text-xs text-gray-600 mt-6">
          © {new Date().getFullYear()} TallerPro · Hecho en México 🇲🇽
        </div>
      </footer>

    </div>
  )
}
