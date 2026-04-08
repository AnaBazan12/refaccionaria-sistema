import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface Props {
  children:     React.ReactNode
  rolesPermitidos: string[]
}

export default function RutaProtegida({ children, rolesPermitidos }: Props) {
  const { usuario } = useAuth()

  if (!usuario) return <Navigate to="/login" replace />

  if (!rolesPermitidos.includes(usuario.rol)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-5xl">🔒</div>
        <div className="text-lg font-semibold text-gray-700">Acceso restringido</div>
        <div className="text-sm text-gray-500">
          No tienes permiso para ver esta sección
        </div>
      </div>
    )
  }

  return <>{children}</>
}