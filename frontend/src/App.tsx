import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StockBajoProvider }    from './context/StockBajoContext'
import Sidebar        from './components/ui/Sidebar'
import RutaProtegida  from './components/ui/RutaProtegida'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Ordenes        from './pages/Ordenes'
import Clientes       from './pages/Clientes'
import Vehiculos      from './pages/Vehiculos'
import Inventario     from './pages/Inventario'
import Ventas         from './pages/Ventas'
import Reportes       from './pages/Reportes'
import Mecanicos      from './pages/Mecanicos'
import Proveedores    from './pages/Proveedores'
import Usuarios       from './pages/Usuarios'
import Deudas         from './pages/Deudas'
import Cotizaciones   from './pages/Cotizaciones'
import Servicios      from './pages/Servicios'
import MecanicoApp   from './pages/MecanicoApp'
import Landing       from './pages/Landing'
import Caja          from './pages/Caja'
import Compras       from './pages/Compras'

// ── Pantalla de carga ─────────────────────────────────────────
const Cargando = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="text-4xl mb-3">🔧</div>
      <div className="text-gray-500 text-sm">Cargando sistema...</div>
    </div>
  </div>
)

// ── Layout privado — sidebar + contenido ──────────────────────
const LayoutPrivado = () => {
  const { usuario, cargando } = useAuth()

  // Mientras verifica la sesión muestra pantalla de carga
  if (cargando) return <Cargando />

  // Si no hay sesión manda al login
  if (!usuario) return <Navigate to="/login" replace />

  // Mecánico siempre va a su app móvil
  if (usuario.rol === 'MECANICO') return <Navigate to="/mecanico" replace />

  return (
    <StockBajoProvider>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </StockBajoProvider>
  )
}

// ── Layout mecánico — sin sidebar, pantalla completa móvil ────
const LayoutMecanico = () => {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol !== 'MECANICO') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

// ── Ruta pública — si ya tiene sesión manda según rol ─────────
const RutaPublica = ({ children }: { children: React.ReactNode }) => {
  const { usuario, cargando } = useAuth()

  if (cargando) return <Cargando />

  // Si ya está logueado no puede ver el login
  if (usuario) {
    return <Navigate to={usuario.rol === 'MECANICO' ? '/mecanico' : '/dashboard'} replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Ruta pública ────────────────────────────── */}
          <Route
            path="/login"
            element={
              <RutaPublica>
                <Login />
              </RutaPublica>
            }
          />

          {/* ── Ruta mecánico (sin sidebar) ─────────────── */}
          <Route element={<LayoutMecanico />}>
            <Route path="/mecanico" element={<MecanicoApp />} />
          </Route>

          {/* ── Rutas privadas ───────────────────────────── */}
          <Route element={<LayoutPrivado />}>

            {/* Todos los roles */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />
            <Route
              path="/ordenes"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA','MECANICO']}>
                  <Ordenes />
                </RutaProtegida>
              }
            />

            {/* Admin y Recepcionista */}
            <Route
              path="/clientes"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA']}>
                  <Clientes />
                </RutaProtegida>
              }
            />
            <Route
              path="/vehiculos"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA']}>
                  <Vehiculos />
                </RutaProtegida>
              }
            />
            <Route
              path="/inventario"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA']}>
                  <Inventario />
                </RutaProtegida>
              }
            />
            <Route
              path="/ventas"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA']}>
                  <Ventas />
                </RutaProtegida>
              }
            />
            <Route
              path="/cotizaciones"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA']}>
                  <Cotizaciones />
                </RutaProtegida>
              }
            />
            <Route
              path="/caja"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA']}>
                  <Caja />
                </RutaProtegida>
              }
            />
            <Route
              path="/reportes"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA']}>
                  <Reportes />
                </RutaProtegida>
              }
            />
            <Route
              path="/deudas"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN','RECEPCIONISTA']}>
                  <Deudas />
                </RutaProtegida>
              }
            />

            {/* Solo Admin */}
            <Route
              path="/servicios"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN']}>
                  <Servicios />
                </RutaProtegida>
              }
            />
            <Route
              path="/mecanicos"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN']}>
                  <Mecanicos />
                </RutaProtegida>
              }
            />
            <Route
              path="/proveedores"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN']}>
                  <Proveedores />
                </RutaProtegida>
              }
            />
            <Route
              path="/compras"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN']}>
                  <Compras />
                </RutaProtegida>
              }
            />
            <Route
              path="/usuarios"
              element={
                <RutaProtegida rolesPermitidos={['ADMIN']}>
                  <Usuarios />
                </RutaProtegida>
              }
            />

            {/* Cualquier ruta desconocida dentro del layout */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* ── Ruta raíz — landing si no hay sesión ─────────── */}
          <Route
            path="/"
            element={<RutaRaiz />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// Ruta raíz: landing para visitantes, dashboard para usuarios con sesión
const RutaRaiz = () => {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (!usuario) return <Landing />
  return <Navigate to={usuario.rol === 'MECANICO' ? '/mecanico' : '/dashboard'} replace />
}