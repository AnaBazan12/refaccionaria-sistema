import { useNavigate } from 'react-router-dom'

const WA_NUM = '524439392115'
const WA_URL = `https://wa.me/${WA_NUM}?text=${encodeURIComponent('Hola, vi su página y quiero información 🔧')}`

const WA_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.113.553 4.094 1.52 5.814L0 24l6.338-1.5A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.822 9.822 0 01-5.027-1.375l-.36-.214-3.732.882.934-3.617-.235-.374A9.823 9.823 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
  </svg>
)

const REFACCIONES = [
  'Filtros de aceite, aire y combustible',
  'Pastillas y balatas de freno',
  'Bujías y cables',
  'Baterías y alternadores',
  'Correas y bandas',
  'Aceites y lubricantes',
  'Amortiguadores y suspensión',
  'Piezas de motor y transmisión',
]

const TALLER = [
  'Afinación mayor y menor',
  'Frenos — cambio y ajuste',
  'Suspensión y dirección',
  'Cambio de aceite y filtros',
  'Sistema eléctrico automotriz',
  'Diagnóstico computarizado',
  'Revisión general del vehículo',
  'Motores y transmisión',
]

const VENTAJAS = [
  { icon: '💳', titulo: 'Crédito semanal para talleres', desc: 'Mecánicos y talleres frecuentes compran a crédito. Sin trámites — solo confianza.' },
  { icon: '🏍️', titulo: 'Entrega en tu colonia',         desc: 'Pedido por WhatsApp, entregado dentro de Tarímbaro. Tu taller no para mientras esperas.' },
  { icon: '🤝', titulo: 'Precio de mecánico',            desc: 'Si eres taller o compras volumen, negociamos precio. No hay etiqueta fija para clientes frecuentes.' },
  { icon: '⚡', titulo: 'Conseguimos lo que no hay',     desc: 'Si no tenemos la pieza, la buscamos. No te mandamos a la ciudad con las manos vacías.' },
]

const ZONAS = [
  'Fracc. Galaxia', 'Fracc. Metrópolis', 'Hacienda del Sol',
  'Tarímbaro cabecera', 'Cuto del Porvenir', 'Téjaro',
  'Uruétaro', 'Campestre Tarímbaro', 'Puerta del Sol', 'Y más...',
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: '#0f0c0a', color: '#f2eae0', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(15,12,10,.92)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(242,234,224,.08)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: "'Arial Narrow',Arial,sans-serif", fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '-.01em', color: '#f2eae0' }}>
          El Chino <span style={{ color: '#d62b1f' }}>·</span> Taller
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href={WA_URL} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 13,
            padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
          }}>
            {WA_ICON} WhatsApp
          </a>
          <button onClick={() => navigate('/login')} style={{
            background: 'transparent', border: '1px solid rgba(242,234,224,.2)',
            color: 'rgba(242,234,224,.7)', fontSize: 13, fontWeight: 600,
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
          }}>
            Sistema →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '100px 28px 64px', position: 'relative', overflow: 'hidden',
      }}>
        {/* grid background */}
        <div style={{
          position: 'absolute', inset: 0, opacity: .25,
          backgroundImage: 'linear-gradient(rgba(242,234,224,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(242,234,224,.15) 1px,transparent 1px)',
          backgroundSize: '44px 44px',
        }} />
        {/* red bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 5, height: '100%', background: '#d62b1f' }} />

        <div style={{ position: 'relative', maxWidth: 680, animation: 'fadeUp .5s ease both' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#d62b1f', marginBottom: 18 }}>
            Peña del Panal · Tarímbaro · Michoacán
          </p>
          <h1 style={{
            fontFamily: "'Arial Narrow',Arial,'Helvetica Neue',sans-serif",
            fontSize: 'clamp(52px,13vw,100px)', fontWeight: 900,
            lineHeight: .88, textTransform: 'uppercase', letterSpacing: '-.02em',
            color: '#f2eae0', marginBottom: 12,
          }}>
            Refaccionaria<br />
            <span style={{ color: '#d62b1f' }}>El Chino</span><br />
            y Taller
          </h1>
          <p style={{ fontSize: 'clamp(14px,3vw,18px)', color: '#9b8f85', marginBottom: 40, fontWeight: 500 }}>
            Refacciones · Mecánica General · Tarímbaro, Michoacán
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a href={WA_URL} target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 15,
              padding: '14px 28px', borderRadius: 8, textDecoration: 'none',
              transition: 'transform .15s',
            }}>
              {WA_ICON} Escríbenos por WhatsApp
            </a>
            <a href="#servicios" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent', color: '#f2eae0', fontWeight: 600, fontSize: 14,
              padding: '14px 22px', borderRadius: 8,
              border: '1.5px solid rgba(242,234,224,.18)', textDecoration: 'none',
            }}>
              Ver servicios ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="servicios" style={{ background: '#141010', padding: '72px 28px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: '#d62b1f', marginBottom: 8 }}>Lo que hacemos</p>
          <h2 style={{
            fontFamily: "'Arial Narrow',Arial,sans-serif", fontWeight: 900,
            fontSize: 'clamp(30px,7vw,46px)', textTransform: 'uppercase',
            lineHeight: .95, color: '#f2eae0', marginBottom: 32,
          }}>
            Refacciones<br />y Mecánica
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
            {[
              { icon: '🔩', title: 'Refaccionaria', items: REFACCIONES },
              { icon: '🔧', title: 'Taller Mecánico', items: TALLER },
            ].map(({ icon, title, items }) => (
              <div key={title} style={{
                background: '#1a1512', border: '1.5px solid #332a23',
                borderRadius: 12, padding: '24px 20px', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#d62b1f' }} />
                <span style={{ fontSize: 30, display: 'block', marginBottom: 14 }}>{icon}</span>
                <div style={{
                  fontFamily: "'Arial Narrow',Arial,sans-serif", fontSize: 21,
                  fontWeight: 900, textTransform: 'uppercase', color: '#f2eae0', marginBottom: 14,
                }}>{title}</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(item => (
                    <li key={item} style={{ fontSize: 13, color: '#9b8f85', display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1.3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d62b1f', flexShrink: 0, display: 'inline-block' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section style={{ background: '#1a1512', borderTop: '1px solid #332a23', borderBottom: '1px solid #332a23', padding: '72px 28px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: '#d62b1f', marginBottom: 8 }}>¿Por qué nosotros?</p>
          <h2 style={{
            fontFamily: "'Arial Narrow',Arial,sans-serif", fontWeight: 900,
            fontSize: 'clamp(30px,7vw,46px)', textTransform: 'uppercase',
            lineHeight: .95, color: '#f2eae0', marginBottom: 36,
          }}>
            El servicio que<br />una cadena no da
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 28 }}>
            {VENTAJAS.map(({ icon, titulo, desc }) => (
              <div key={titulo}>
                <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>{icon}</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f2eae0', marginBottom: 4 }}>{titulo}</div>
                <div style={{ fontSize: 13, color: '#9b8f85', lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COVERAGE ── */}
      <section style={{ background: '#141010', padding: '72px 28px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: '#d62b1f', marginBottom: 8 }}>Zona de servicio</p>
          <h2 style={{
            fontFamily: "'Arial Narrow',Arial,sans-serif", fontWeight: 900,
            fontSize: 'clamp(30px,7vw,46px)', textTransform: 'uppercase',
            lineHeight: .95, color: '#f2eae0', marginBottom: 12,
          }}>
            Servimos a todo<br />Tarímbaro
          </h2>
          <p style={{ fontSize: 13.5, color: '#9b8f85', marginBottom: 18 }}>Entregamos a domicilio o pasa a vernos en Peña del Panal:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 100, background: '#d62b1f', color: '#fff' }}>
              📍 Peña del Panal
            </span>
            {ZONAS.map(z => (
              <span key={z} style={{
                fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 100,
                background: '#221c18', color: '#f2eae0', border: '1px solid #332a23',
              }}>{z}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contacto" style={{ background: '#0f0c0a', padding: '72px 28px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: '#d62b1f', marginBottom: 8 }}>Contacto</p>
          <h2 style={{
            fontFamily: "'Arial Narrow',Arial,sans-serif", fontWeight: 900,
            fontSize: 'clamp(30px,7vw,46px)', textTransform: 'uppercase',
            lineHeight: .95, color: '#f2eae0', marginBottom: 28,
          }}>
            Estamos aquí<br />para atenderte
          </h2>
          <div style={{
            background: '#1a1512', border: '1.5px solid #332a23',
            borderRadius: 16, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 22,
            maxWidth: 480,
          }}>
            {[
              { icon: '📍', label: 'Ubicación',          value: 'Peña del Panal, Tarímbaro, Michoacán 58883' },
              { icon: '🕐', label: 'Horario',             value: 'Lunes a Sábado · 8:00 am – 7:00 pm' },
              { icon: '📱', label: 'WhatsApp / Teléfono', value: '443 939 2115' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  fontSize: 18, flexShrink: 0, width: 40, height: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#221c18', borderRadius: 10,
                }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9b8f85', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#f2eae0' }}>{value}</div>
                </div>
              </div>
            ))}
            <a href={WA_URL} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 16,
              padding: 16, borderRadius: 12, textDecoration: 'none', marginTop: 4,
            }}>
              {WA_ICON} Enviar mensaje ahora
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '28px 24px', textAlign: 'center',
        borderTop: '1px solid #332a23', fontSize: 12, color: '#9b8f85',
      }}>
        <strong style={{ color: '#f2eae0' }}>Refaccionaria El Chino y Taller Mecánico</strong><br />
        Peña del Panal, Tarímbaro, Michoacán &nbsp;·&nbsp; © {new Date().getFullYear()}
      </footer>

      {/* ── FLOAT WA ── */}
      <a href={WA_URL} target="_blank" rel="noreferrer" aria-label="Escribir por WhatsApp" style={{
        position: 'fixed', bottom: 22, right: 22,
        width: 54, height: 54, background: '#25D366', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 18px rgba(37,211,102,.45)', textDecoration: 'none', zIndex: 99,
        color: '#fff',
      }}>
        {WA_ICON}
      </a>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @media (prefers-reduced-motion: reduce) { [style*="fadeUp"] { animation: none !important; } }
        a:focus-visible { outline: 2px solid #d62b1f; outline-offset: 3px; }
      `}</style>
    </div>
  )
}
