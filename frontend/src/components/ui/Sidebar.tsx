import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate }        from 'react-router-dom'
import { useAuth }                     from '../../context/AuthContext'
import { useStockBajo }                from '../../context/StockBajoContext'
import LogoRefaccionaria               from './LogoRefaccionaria'

// Cada item del menú tiene una lista de roles que pueden verlo
const menu = [
  { ruta: '/dashboard', icono: '📊', label: 'Dashboard',          roles: ['ADMIN', 'RECEPCIONISTA', 'MECANICO'] },
  { ruta: '/ordenes',   icono: '🔧', label: 'Órdenes',            roles: ['ADMIN', 'RECEPCIONISTA', 'MECANICO'] },
  { ruta: '/clientes',  icono: '👥', label: 'Clientes',           roles: ['ADMIN', 'RECEPCIONISTA'] },
  { ruta: '/vehiculos', icono: '🚗', label: 'Vehículos',          roles: ['ADMIN', 'RECEPCIONISTA'] },
  { ruta: '/inventario',icono: '📦', label: 'Inventario',         roles: ['ADMIN', 'RECEPCIONISTA'] },
  { ruta: '/ventas',    icono: '💰', label: 'Ventas',             roles: ['ADMIN', 'RECEPCIONISTA'] },
  { ruta: '/caja',      icono: '🏦', label: 'Corte de caja',      roles: ['ADMIN', 'RECEPCIONISTA'] },
  { ruta: '/reportes',  icono: '📈', label: 'Reportes',           roles: ['ADMIN', 'RECEPCIONISTA'] },
  { ruta: '/mecanicos', icono: '👨‍🔧', label: 'Mecánicos',          roles: ['ADMIN'] },
  { ruta: '/proveedores',icono:'🏭', label: 'Proveedores',        roles: ['ADMIN'] },
  { ruta: '/compras',   icono: '🛒', label: 'Compras',            roles: ['ADMIN'] },
  { ruta: '/usuarios',  icono: '⚙️', label: 'Usuarios',           roles: ['ADMIN'] },
  { ruta: '/deudas',    icono: '💳', label: 'Cuentas por cobrar', roles: ['ADMIN', 'RECEPCIONISTA'] },
  { ruta: '/cotizaciones',icono:'📋',label: 'Cotizaciones',       roles: ['ADMIN', 'RECEPCIONISTA'] },
  { ruta: '/servicios', icono: '🛠️', label: 'Servicios',          roles: ['ADMIN'] },
]

const colorRol: Record<string, string> = {
  ADMIN:         'text-purple-400',
  RECEPCIONISTA: 'text-blue-400',
  MECANICO:      'text-amber-400',
}

/* ── Panel mini de stock bajo ─────────────────────────────────── */
function PanelStockBajo({ onCerrar }: { onCerrar: () => void }) {
  const { items, conteo, refrescar } = useStockBajo()
  const navigate = useNavigate()

  const irAInventario = () => {
    navigate('/inventario?stockBajo=true')
    onCerrar()
  }

  return (
    <div
      className="absolute left-64 top-0 ml-2 z-50 w-72
                 bg-white rounded-xl shadow-2xl border border-gray-200
                 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
                      bg-red-50 border-b border-red-100">
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <div className="text-sm font-bold text-red-700">Stock bajo</div>
            <div className="text-xs text-red-500">
              {conteo} pieza{conteo !== 1 ? 's' : ''} bajo mínimo
            </div>
          </div>
        </div>
        <button
          onClick={onCerrar}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >×</button>
      </div>

      {/* Lista */}
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            Cargando lista…
          </div>
        ) : (
          items.slice(0, 10).map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {item.nombre}
                </div>
                <div className="text-xs text-gray-400 font-mono">{item.codigo}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-bold ${
                  item.stockActual === 0 ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {item.stockActual} pzas
                </div>
                <div className="text-xs text-gray-400">mín: {item.stockMinimo}</div>
              </div>
            </div>
          ))
        )}
        {items.length > 10 && (
          <div className="px-4 py-2 text-xs text-gray-400 text-center bg-gray-50">
            +{items.length - 10} más…
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
        <button
          onClick={irAInventario}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs
                     font-medium px-3 py-2 rounded-lg transition-colors"
        >
          Ver en inventario →
        </button>
        <button
          onClick={() => { refrescar(); onCerrar() }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-xs
                     text-gray-600 hover:bg-gray-100 transition-colors"
          title="Refrescar"
        >
          ↻
        </button>
      </div>
    </div>
  )
}

/* ── Sidebar principal ────────────────────────────────────────── */
export default function Sidebar() {
  const { usuario, logout }    = useAuth()
  const { conteo }             = useStockBajo()
  const [panelAbierto, setPanelAbierto] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    if (!panelAbierto) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [panelAbierto])

  const menuVisible = menu.filter(item =>
    item.roles.includes(usuario?.rol ?? '')
  )

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <img
            src="/LogoRefaccionaria.png"
            alt="Logo"
            className="h-9 w-9 object-contain rounded-lg"
            onError={e => {
              const img = e.target as HTMLImageElement
              img.style.display = 'none'
              img.nextElementSibling?.classList.remove('hidden')
            }}
          />
          <div className="hidden">
            <LogoRefaccionaria size={36} />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Refaccionaria El Chino</div>
            <div className="text-xs text-purple-300 font-medium">y Taller Mecánico</div>
          </div>
        </div>
      </div>

      {/* Usuario actual */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="text-sm font-medium">{usuario?.nombre}</div>
        <div className={`text-xs font-medium mt-0.5 ${colorRol[usuario?.rol ?? '']}`}>
          {usuario?.rol}
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuVisible.map(item => {
          const esInventario = item.ruta === '/inventario'
          const hayAlerta    = esInventario && conteo > 0

          return (
            <div key={item.ruta} className="relative" ref={hayAlerta ? panelRef : undefined}>
              <NavLink
                to={item.ruta}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                   transition-colors ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'}`
                }
              >
                <span>{item.icono}</span>
                <span className="flex-1">{item.label}</span>

                {/* Badge de stock bajo */}
                {hayAlerta && (
                  <button
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setPanelAbierto(prev => !prev)
                    }}
                    className="flex items-center justify-center
                               min-w-[20px] h-5 px-1.5 rounded-full
                               bg-red-500 hover:bg-red-400
                               text-white text-[10px] font-bold
                               transition-colors animate-pulse"
                    title={`${conteo} piezas bajo stock mínimo`}
                  >
                    {conteo > 99 ? '99+' : conteo}
                  </button>
                )}
              </NavLink>

              {/* Panel flotante */}
              {hayAlerta && panelAbierto && (
                <PanelStockBajo onCerrar={() => setPanelAbierto(false)} />
              )}
            </div>
          )
        })}
      </nav>

      {/* Cerrar sesión */}
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                     text-gray-300 hover:bg-gray-800 w-full transition-colors"
        >
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
