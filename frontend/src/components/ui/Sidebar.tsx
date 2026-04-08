import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Cada item del menú tiene una lista de roles que pueden verlo
const menu = [
  {
    ruta: '/dashboard',
    icono: '📊',
    label: 'Dashboard',
    roles: ['ADMIN', 'RECEPCIONISTA', 'MECANICO']
  },
  {
    ruta: '/ordenes',
    icono: '🔧',
    label: 'Órdenes',
    roles: ['ADMIN', 'RECEPCIONISTA', 'MECANICO']
  },
  {
    ruta: '/clientes',
    icono: '👥',
    label: 'Clientes',
    roles: ['ADMIN', 'RECEPCIONISTA']
  },
  {
    ruta: '/vehiculos',
    icono: '🚗',
    label: 'Vehículos',
    roles: ['ADMIN', 'RECEPCIONISTA']
  },
  {
    ruta: '/inventario',
    icono: '📦',
    label: 'Inventario',
    roles: ['ADMIN', 'RECEPCIONISTA']
  },
  {
    ruta: '/ventas',
    icono: '💰',
    label: 'Ventas',
    roles: ['ADMIN', 'RECEPCIONISTA']
  },
  {
    ruta: '/reportes',
    icono: '📈',
    label: 'Reportes',
    roles: ['ADMIN', 'RECEPCIONISTA']
  },
  {
    ruta: '/mecanicos',
    icono: '👨‍🔧',
    label: 'Mecánicos',
    roles: ['ADMIN']
  },
  {
    ruta: '/proveedores',
    icono: '🏭',
    label: 'Proveedores',
    roles: ['ADMIN']
  },
  {
    ruta: '/usuarios',
    icono: '⚙️',
    label: 'Usuarios',
    roles: ['ADMIN']
  },
  {
  ruta:  '/deudas',
  icono: '💳',
  label: 'Cuentas por cobrar',
  roles: ['ADMIN', 'RECEPCIONISTA']
},
{
  ruta:  '/cotizaciones',
  icono: '📋',
  label: 'Cotizaciones',
  roles: ['ADMIN', 'RECEPCIONISTA']
},
]

const colorRol: Record<string, string> = {
  ADMIN:         'text-purple-400',
  RECEPCIONISTA: 'text-blue-400',
  MECANICO:      'text-amber-400',
}

export default function Sidebar() {
  const { usuario, logout } = useAuth()

  // Filtrar el menú según el rol del usuario actual
  const menuVisible = menu.filter(item =>
    item.roles.includes(usuario?.rol ?? '')
  )

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="text-xl font-bold">🔧 Refaccionaria</div>
        <div className="text-xs text-gray-400 mt-1">Sistema de gestión</div>
      </div>

      {/* Usuario actual */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="text-sm font-medium">{usuario?.nombre}</div>
        <div className={`text-xs font-medium mt-0.5 ${colorRol[usuario?.rol ?? '']}`}>
          {usuario?.rol}
        </div>
      </div>

      {/* Navegación filtrada por rol */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuVisible.map(item => (
          <NavLink
            key={item.ruta}
            to={item.ruta}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
               transition-colors ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'}`
            }
          >
            <span>{item.icono}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
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